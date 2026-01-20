import { supabase, DbMember, DbGroup, DbExpense, DbSettlement } from '@/lib/supabase';
import {
  Member,
  Group,
  Expense,
  Settlement,
  CreateMember,
  CreateGroup,
  CreateExpense,
  CreateSettlement,
} from '@/types';

// Note: User functions are in ./users.ts and should be imported directly

// Convert DB rows to app types
function toMember(row: DbMember): Member {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function toGroup(row: DbGroup): Group {
  return {
    id: row.id,
    name: row.name,
    memberIds: row.member_ids || [],
    createdAt: row.created_at,
  };
}

function toExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: row.amount,
    paidByMemberId: row.paid_by_member_id,
    splitType: row.split_type as 'equal' | 'shares' | 'percentage',
    splitDetails: row.split_details || [],
    createdAt: row.created_at,
  };
}

function toSettlement(row: DbSettlement): Settlement {
  return {
    id: row.id,
    groupId: row.group_id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

// Members CRUD
export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toMember);
}

export async function getMember(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? toMember(data) : null;
}

export async function createMember(input: CreateMember): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ name: input.name })
    .select()
    .single();

  if (error) throw error;
  return toMember(data);
}

export async function updateMember(
  id: string,
  input: Partial<CreateMember>
): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .update({ name: input.name })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? toMember(data) : null;
}

export async function deleteMember(id: string): Promise<boolean> {
  // Get all groups to update member_ids
  const { data: groups } = await supabase
    .from('groups')
    .select('id, member_ids')
    .contains('member_ids', [id]);

  // Remove member from all groups
  if (groups && groups.length > 0) {
    for (const group of groups) {
      const newMemberIds = (group.member_ids || []).filter((mid: string) => mid !== id);
      await supabase
        .from('groups')
        .update({ member_ids: newMemberIds })
        .eq('id', group.id);
    }
  }

  // Get all expenses to update split_details (remove this member from splits)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, split_details, paid_by_member_id');

  if (expenses && expenses.length > 0) {
    for (const expense of expenses) {
      // If this member was the payer, delete the expense
      if (expense.paid_by_member_id === id) {
        await supabase.from('expenses').delete().eq('id', expense.id);
        continue;
      }

      // Otherwise, remove the member from split_details
      const splitDetails = expense.split_details as { memberId: string; value: number }[];
      const memberInSplit = splitDetails.some(d => d.memberId === id);

      if (memberInSplit) {
        const newSplitDetails = splitDetails.filter(d => d.memberId !== id);

        // If no one left in the split, delete the expense
        if (newSplitDetails.length === 0) {
          await supabase.from('expenses').delete().eq('id', expense.id);
        } else {
          await supabase
            .from('expenses')
            .update({ split_details: newSplitDetails })
            .eq('id', expense.id);
        }
      }
    }
  }

  // Delete settlements involving this member
  await supabase
    .from('settlements')
    .delete()
    .or(`from_member_id.eq.${id},to_member_id.eq.${id}`);

  // Finally delete the member
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Groups CRUD
export async function getGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toGroup);
}

export async function getGroup(id: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? toGroup(data) : null;
}

export async function createGroup(input: CreateGroup): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: input.name,
      member_ids: input.memberIds || [],
    })
    .select()
    .single();

  if (error) throw error;
  return toGroup(data);
}

export async function updateGroup(
  id: string,
  input: Partial<CreateGroup>
): Promise<Group | null> {
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.memberIds !== undefined) updateData.member_ids = input.memberIds;

  const { data, error } = await supabase
    .from('groups')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? toGroup(data) : null;
}

export async function deleteGroup(id: string): Promise<boolean> {
  // Expenses and settlements will be cascade deleted due to FK constraints
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function addMemberToGroup(
  groupId: string,
  memberId: string
): Promise<Group | null> {
  const group = await getGroup(groupId);
  if (!group) return null;

  if (!group.memberIds.includes(memberId)) {
    const newMemberIds = [...group.memberIds, memberId];
    return updateGroup(groupId, { memberIds: newMemberIds });
  }
  return group;
}

export async function removeMemberFromGroup(
  groupId: string,
  memberId: string
): Promise<Group | null> {
  const group = await getGroup(groupId);
  if (!group) return null;

  const newMemberIds = group.memberIds.filter((id) => id !== memberId);
  return updateGroup(groupId, { memberIds: newMemberIds });
}

// Expenses CRUD
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toExpense);
}

export async function getExpensesByGroup(groupId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toExpense);
}

export async function getExpense(id: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? toExpense(data) : null;
}

export async function createExpense(input: CreateExpense): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      group_id: input.groupId,
      description: input.description,
      amount: input.amount,
      paid_by_member_id: input.paidByMemberId,
      split_type: input.splitType,
      split_details: input.splitDetails,
    })
    .select()
    .single();

  if (error) throw error;
  return toExpense(data);
}

export async function updateExpense(
  id: string,
  input: Partial<CreateExpense>
): Promise<Expense | null> {
  const updateData: Record<string, unknown> = {};
  if (input.groupId !== undefined) updateData.group_id = input.groupId;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.paidByMemberId !== undefined) updateData.paid_by_member_id = input.paidByMemberId;
  if (input.splitType !== undefined) updateData.split_type = input.splitType;
  if (input.splitDetails !== undefined) updateData.split_details = input.splitDetails;

  const { data, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? toExpense(data) : null;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Settlements CRUD
export async function getSettlements(): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toSettlement);
}

export async function getSettlementsByGroup(groupId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toSettlement);
}

export async function getSettlement(id: string): Promise<Settlement | null> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? toSettlement(data) : null;
}

export async function createSettlement(input: CreateSettlement): Promise<Settlement> {
  const { data, error } = await supabase
    .from('settlements')
    .insert({
      group_id: input.groupId,
      from_member_id: input.fromMemberId,
      to_member_id: input.toMemberId,
      amount: input.amount,
    })
    .select()
    .single();

  if (error) throw error;
  return toSettlement(data);
}

export async function deleteSettlement(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('settlements')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Utility to get members by IDs
export async function getMembersByIds(ids: string[]): Promise<Member[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .in('id', ids);

  if (error) throw error;
  return (data || []).map(toMember);
}
