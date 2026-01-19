import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { User, UserSchema, CreateUser, UpdateUser } from '@/types/auth';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Generic JSON file operations
async function readJsonFile<T>(filePath: string): Promise<T[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Users CRUD
export async function getUsers(): Promise<User[]> {
  const data = await readJsonFile<User>(USERS_FILE);
  return data.map((u) => UserSchema.parse(u));
}

export async function getUser(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.email === email) || null;
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.googleId === googleId) || null;
}

export async function createUser(input: CreateUser): Promise<User> {
  const users = await getUsers();
  const now = new Date().toISOString();
  const newUser: User = {
    id: uuidv4(),
    email: input.email,
    name: input.name,
    image: input.image,
    googleId: input.googleId,
    linkedMemberIds: [],
    createdAt: now,
    updatedAt: now,
  };
  users.push(newUser);
  await writeJsonFile(USERS_FILE, users);
  return newUser;
}

export async function updateUser(
  id: string,
  input: UpdateUser
): Promise<User | null> {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(USERS_FILE, users);
  return users[index];
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;

  await writeJsonFile(USERS_FILE, filtered);
  return true;
}

export async function linkMemberToUser(
  userId: string,
  memberId: string
): Promise<User | null> {
  const user = await getUser(userId);
  if (!user) return null;

  if (!user.linkedMemberIds.includes(memberId)) {
    user.linkedMemberIds.push(memberId);
    await updateUser(userId, { linkedMemberIds: user.linkedMemberIds });
  }
  return user;
}

export async function unlinkMemberFromUser(
  userId: string,
  memberId: string
): Promise<User | null> {
  const user = await getUser(userId);
  if (!user) return null;

  user.linkedMemberIds = user.linkedMemberIds.filter((id) => id !== memberId);
  await updateUser(userId, { linkedMemberIds: user.linkedMemberIds });
  return user;
}

// Find or create user from Google OAuth profile
export async function findOrCreateUserFromGoogle(profile: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<User> {
  // First try to find by Google ID
  let user = await getUserByGoogleId(profile.id);
  if (user) {
    // Update name and image if changed
    if (user.name !== profile.name || user.image !== profile.image) {
      user = await updateUser(user.id, {
        name: profile.name ?? null,
        image: profile.image ?? null,
      });
    }
    return user!;
  }

  // Then try to find by email
  user = await getUserByEmail(profile.email);
  if (user) {
    // Link Google ID to existing user
    // Note: In a real app, you might want to handle this differently
    return user;
  }

  // Create new user
  return createUser({
    email: profile.email,
    name: profile.name ?? null,
    image: profile.image ?? null,
    googleId: profile.id,
  });
}
