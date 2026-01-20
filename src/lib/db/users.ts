import { supabase, DbUser } from '@/lib/supabase';
import { User, CreateUser, UpdateUser } from '@/types/auth';

// Convert DB row to app type
function toUser(row: DbUser): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    googleId: row.google_id,
    linkedMemberIds: row.linked_member_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Users CRUD
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toUser);
}

export async function getUser(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data ? toUser(data) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data ? toUser(data) : null;
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data ? toUser(data) : null;
}

export async function createUser(input: CreateUser): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: input.email,
      name: input.name,
      image: input.image,
      google_id: input.googleId,
      linked_member_ids: [],
    })
    .select()
    .single();

  if (error) throw error;
  return toUser(data);
}

export async function updateUser(
  id: string,
  input: UpdateUser
): Promise<User | null> {
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.image !== undefined) updateData.image = input.image;
  if (input.linkedMemberIds !== undefined) updateData.linked_member_ids = input.linkedMemberIds;

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data ? toUser(data) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function linkMemberToUser(
  userId: string,
  memberId: string
): Promise<User | null> {
  const user = await getUser(userId);
  if (!user) return null;

  if (!user.linkedMemberIds.includes(memberId)) {
    const newLinkedMemberIds = [...user.linkedMemberIds, memberId];
    return updateUser(userId, { linkedMemberIds: newLinkedMemberIds });
  }
  return user;
}

export async function unlinkMemberFromUser(
  userId: string,
  memberId: string
): Promise<User | null> {
  const user = await getUser(userId);
  if (!user) return null;

  const newLinkedMemberIds = user.linkedMemberIds.filter((id) => id !== memberId);
  return updateUser(userId, { linkedMemberIds: newLinkedMemberIds });
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
