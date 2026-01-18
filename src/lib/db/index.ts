import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Member,
  Group,
  Expense,
  Settlement,
  MemberSchema,
  GroupSchema,
  ExpenseSchema,
  SettlementSchema,
  CreateMember,
  CreateGroup,
  CreateExpense,
  CreateSettlement,
  convertToSplitDetails,
} from '@/types';

// Type for old expense format (before split types were added)
interface LegacyExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidByMemberId: string;
  splitBetweenMemberIds?: string[];
  splitType?: string;
  splitDetails?: { memberId: string; value: number }[];
  createdAt: string;
}

/**
 * Migrate old expense format to new format.
 * Old format used splitBetweenMemberIds, new format uses splitType and splitDetails.
 */
function migrateExpense(raw: LegacyExpense): Expense {
  // If already in new format, parse directly
  if (raw.splitDetails && raw.splitType) {
    return ExpenseSchema.parse(raw);
  }

  // Migrate from old format
  if (raw.splitBetweenMemberIds) {
    const migrated = {
      ...raw,
      splitType: 'equal' as const,
      splitDetails: convertToSplitDetails(raw.splitBetweenMemberIds),
    };
    // Remove old field before parsing
    delete (migrated as Partial<LegacyExpense>).splitBetweenMemberIds;
    return ExpenseSchema.parse(migrated);
  }

  // Fallback: try parsing as-is (will throw if invalid)
  return ExpenseSchema.parse(raw);
}

const DATA_DIR = path.join(process.cwd(), 'data');

// File paths
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');
const SETTLEMENTS_FILE = path.join(DATA_DIR, 'settlements.json');

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

// Members CRUD
export async function getMembers(): Promise<Member[]> {
  const data = await readJsonFile<Member>(MEMBERS_FILE);
  return data.map((m) => MemberSchema.parse(m));
}

export async function getMember(id: string): Promise<Member | null> {
  const members = await getMembers();
  return members.find((m) => m.id === id) || null;
}

export async function createMember(input: CreateMember): Promise<Member> {
  const members = await getMembers();
  const newMember: Member = {
    id: uuidv4(),
    name: input.name,
    createdAt: new Date().toISOString(),
  };
  members.push(newMember);
  await writeJsonFile(MEMBERS_FILE, members);
  return newMember;
}

export async function updateMember(
  id: string,
  input: Partial<CreateMember>
): Promise<Member | null> {
  const members = await getMembers();
  const index = members.findIndex((m) => m.id === id);
  if (index === -1) return null;

  members[index] = { ...members[index], ...input };
  await writeJsonFile(MEMBERS_FILE, members);
  return members[index];
}

export async function deleteMember(id: string): Promise<boolean> {
  const members = await getMembers();
  const filtered = members.filter((m) => m.id !== id);
  if (filtered.length === members.length) return false;

  await writeJsonFile(MEMBERS_FILE, filtered);
  return true;
}

// Groups CRUD
export async function getGroups(): Promise<Group[]> {
  const data = await readJsonFile<Group>(GROUPS_FILE);
  return data.map((g) => GroupSchema.parse(g));
}

export async function getGroup(id: string): Promise<Group | null> {
  const groups = await getGroups();
  return groups.find((g) => g.id === id) || null;
}

export async function createGroup(input: CreateGroup): Promise<Group> {
  const groups = await getGroups();
  const newGroup: Group = {
    id: uuidv4(),
    name: input.name,
    memberIds: input.memberIds || [],
    createdAt: new Date().toISOString(),
  };
  groups.push(newGroup);
  await writeJsonFile(GROUPS_FILE, groups);
  return newGroup;
}

export async function updateGroup(
  id: string,
  input: Partial<CreateGroup>
): Promise<Group | null> {
  const groups = await getGroups();
  const index = groups.findIndex((g) => g.id === id);
  if (index === -1) return null;

  groups[index] = { ...groups[index], ...input };
  await writeJsonFile(GROUPS_FILE, groups);
  return groups[index];
}

export async function deleteGroup(id: string): Promise<boolean> {
  const groups = await getGroups();
  const filtered = groups.filter((g) => g.id !== id);
  if (filtered.length === groups.length) return false;

  await writeJsonFile(GROUPS_FILE, filtered);
  return true;
}

export async function addMemberToGroup(
  groupId: string,
  memberId: string
): Promise<Group | null> {
  const group = await getGroup(groupId);
  if (!group) return null;

  if (!group.memberIds.includes(memberId)) {
    group.memberIds.push(memberId);
    await updateGroup(groupId, { memberIds: group.memberIds });
  }
  return group;
}

export async function removeMemberFromGroup(
  groupId: string,
  memberId: string
): Promise<Group | null> {
  const group = await getGroup(groupId);
  if (!group) return null;

  group.memberIds = group.memberIds.filter((id) => id !== memberId);
  await updateGroup(groupId, { memberIds: group.memberIds });
  return group;
}

// Expenses CRUD
export async function getExpenses(): Promise<Expense[]> {
  const data = await readJsonFile<LegacyExpense>(EXPENSES_FILE);
  return data.map((e) => migrateExpense(e));
}

export async function getExpensesByGroup(groupId: string): Promise<Expense[]> {
  const expenses = await getExpenses();
  return expenses.filter((e) => e.groupId === groupId);
}

export async function getExpense(id: string): Promise<Expense | null> {
  const expenses = await getExpenses();
  return expenses.find((e) => e.id === id) || null;
}

export async function createExpense(input: CreateExpense): Promise<Expense> {
  const expenses = await getExpenses();
  const newExpense: Expense = {
    id: uuidv4(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  expenses.push(newExpense);
  await writeJsonFile(EXPENSES_FILE, expenses);
  return newExpense;
}

export async function updateExpense(
  id: string,
  input: Partial<CreateExpense>
): Promise<Expense | null> {
  const expenses = await getExpenses();
  const index = expenses.findIndex((e) => e.id === id);
  if (index === -1) return null;

  expenses[index] = { ...expenses[index], ...input };
  await writeJsonFile(EXPENSES_FILE, expenses);
  return expenses[index];
}

export async function deleteExpense(id: string): Promise<boolean> {
  const expenses = await getExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  if (filtered.length === expenses.length) return false;

  await writeJsonFile(EXPENSES_FILE, filtered);
  return true;
}

// Settlements CRUD
export async function getSettlements(): Promise<Settlement[]> {
  const data = await readJsonFile<Settlement>(SETTLEMENTS_FILE);
  return data.map((s) => SettlementSchema.parse(s));
}

export async function getSettlementsByGroup(
  groupId: string
): Promise<Settlement[]> {
  const settlements = await getSettlements();
  return settlements.filter((s) => s.groupId === groupId);
}

export async function getSettlement(id: string): Promise<Settlement | null> {
  const settlements = await getSettlements();
  return settlements.find((s) => s.id === id) || null;
}

export async function createSettlement(
  input: CreateSettlement
): Promise<Settlement> {
  const settlements = await getSettlements();
  const newSettlement: Settlement = {
    id: uuidv4(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  settlements.push(newSettlement);
  await writeJsonFile(SETTLEMENTS_FILE, settlements);
  return newSettlement;
}

export async function deleteSettlement(id: string): Promise<boolean> {
  const settlements = await getSettlements();
  const filtered = settlements.filter((s) => s.id !== id);
  if (filtered.length === settlements.length) return false;

  await writeJsonFile(SETTLEMENTS_FILE, filtered);
  return true;
}

// Utility to get members by IDs
export async function getMembersByIds(ids: string[]): Promise<Member[]> {
  const members = await getMembers();
  return members.filter((m) => ids.includes(m.id));
}
