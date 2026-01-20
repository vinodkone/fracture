import {
  getMembers,
  createMember,
  getMember,
  updateMember,
  deleteMember,
  createGroup,
  getGroup,
  getGroups,
  addMemberToGroup,
  removeMemberFromGroup,
  deleteGroup,
  getExpenses,
  createExpense,
  getExpensesByGroup,
  deleteExpense,
  getSettlements,
  createSettlement,
  getSettlementsByGroup,
  deleteSettlement,
} from '../index';
import { supabase } from '@/lib/supabase';

// Clear all data from Supabase tables
async function clearData() {
  // Delete in order respecting foreign key constraints
  await supabase.from('settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

describe('Database Layer', () => {
  beforeAll(async () => {
    await clearData();
  });

  afterAll(async () => {
    await clearData();
  });

  beforeEach(async () => {
    await clearData();
  });

  describe('Members', () => {
    it('should create and retrieve a member', async () => {
      const member = await createMember({ name: 'Alice' });

      expect(member.id).toBeDefined();
      expect(member.name).toBe('Alice');
      expect(member.createdAt).toBeDefined();

      const retrieved = await getMember(member.id);
      expect(retrieved).toEqual(member);
    });

    it('should list all members', async () => {
      await createMember({ name: 'Alice' });
      await createMember({ name: 'Bob' });

      const members = await getMembers();
      expect(members).toHaveLength(2);
    });

    it('should update a member', async () => {
      const member = await createMember({ name: 'Alice' });
      const updated = await updateMember(member.id, { name: 'Alice Smith' });

      expect(updated?.name).toBe('Alice Smith');
    });

    it('should delete a member', async () => {
      const member = await createMember({ name: 'Alice' });
      const deleted = await deleteMember(member.id);

      expect(deleted).toBe(true);
      expect(await getMember(member.id)).toBeNull();
    });

    it('should cascade delete member from groups', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id] });

      // Verify member is in group
      let retrieved = await getGroup(group.id);
      expect(retrieved?.memberIds).toContain(alice.id);

      // Delete alice
      await deleteMember(alice.id);

      // Verify alice is removed from group
      retrieved = await getGroup(group.id);
      expect(retrieved?.memberIds).not.toContain(alice.id);
      expect(retrieved?.memberIds).toContain(bob.id);
    });

    it('should cascade delete member from expenses', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const charlie = await createMember({ name: 'Charlie' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id, charlie.id] });

      // Create expense with alice, bob, charlie
      await createExpense({
        groupId: group.id,
        description: 'Dinner',
        amount: 6000,
        paidByMemberId: alice.id,
        splitType: 'equal',
        splitDetails: [
          { memberId: alice.id, value: 1 },
          { memberId: bob.id, value: 1 },
          { memberId: charlie.id, value: 1 },
        ],
      });

      // Delete bob (not the payer)
      await deleteMember(bob.id);

      // Expense should still exist but without bob in split
      const expenses = await getExpenses();
      expect(expenses).toHaveLength(1);
      expect(expenses[0].splitDetails).toHaveLength(2);
      expect(expenses[0].splitDetails.find(d => d.memberId === bob.id)).toBeUndefined();
    });

    it('should delete expense when payer is deleted', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id] });

      // Create expense paid by alice
      await createExpense({
        groupId: group.id,
        description: 'Dinner',
        amount: 6000,
        paidByMemberId: alice.id,
        splitType: 'equal',
        splitDetails: [
          { memberId: alice.id, value: 1 },
          { memberId: bob.id, value: 1 },
        ],
      });

      // Delete alice (the payer)
      await deleteMember(alice.id);

      // Expense should be deleted
      const expenses = await getExpenses();
      expect(expenses).toHaveLength(0);
    });

    it('should cascade delete member from settlements', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id] });

      // Create settlement
      await createSettlement({
        groupId: group.id,
        fromMemberId: bob.id,
        toMemberId: alice.id,
        amount: 2500,
      });

      // Delete alice
      await deleteMember(alice.id);

      // Settlement should be deleted
      const settlements = await getSettlements();
      expect(settlements).toHaveLength(0);
    });
  });

  describe('Groups', () => {
    it('should create and retrieve a group', async () => {
      const group = await createGroup({ name: 'Trip' });

      expect(group.id).toBeDefined();
      expect(group.name).toBe('Trip');
      expect(group.memberIds).toEqual([]);

      const retrieved = await getGroup(group.id);
      expect(retrieved).toEqual(group);
    });

    it('should add and remove members from group', async () => {
      const member = await createMember({ name: 'Alice' });
      const group = await createGroup({ name: 'Trip' });

      await addMemberToGroup(group.id, member.id);
      let updated = await getGroup(group.id);
      expect(updated?.memberIds).toContain(member.id);

      await removeMemberFromGroup(group.id, member.id);
      updated = await getGroup(group.id);
      expect(updated?.memberIds).not.toContain(member.id);
    });
  });

  describe('Expenses', () => {
    it('should create and retrieve expenses with equal split', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id] });

      const expense = await createExpense({
        groupId: group.id,
        description: 'Dinner',
        amount: 5000,
        paidByMemberId: alice.id,
        splitType: 'equal',
        splitDetails: [
          { memberId: alice.id, value: 1 },
          { memberId: bob.id, value: 1 },
        ],
      });

      expect(expense.id).toBeDefined();
      expect(expense.amount).toBe(5000);
      expect(expense.splitType).toBe('equal');

      const groupExpenses = await getExpensesByGroup(group.id);
      expect(groupExpenses).toHaveLength(1);
    });

    it('should create expense with shares split', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id] });

      const expense = await createExpense({
        groupId: group.id,
        description: 'Dinner',
        amount: 6000,
        paidByMemberId: alice.id,
        splitType: 'shares',
        splitDetails: [
          { memberId: alice.id, value: 1 },
          { memberId: bob.id, value: 2 },
        ],
      });

      expect(expense.splitType).toBe('shares');
      expect(expense.splitDetails).toHaveLength(2);
    });

    it('should create expense with percentage split', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id] });

      const expense = await createExpense({
        groupId: group.id,
        description: 'Dinner',
        amount: 10000,
        paidByMemberId: alice.id,
        splitType: 'percentage',
        splitDetails: [
          { memberId: alice.id, value: 60 },
          { memberId: bob.id, value: 40 },
        ],
      });

      expect(expense.splitType).toBe('percentage');
    });

    it('should delete an expense', async () => {
      const alice = await createMember({ name: 'Alice' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id] });

      const expense = await createExpense({
        groupId: group.id,
        description: 'Dinner',
        amount: 5000,
        paidByMemberId: alice.id,
        splitType: 'equal',
        splitDetails: [{ memberId: alice.id, value: 1 }],
      });

      const deleted = await deleteExpense(expense.id);
      expect(deleted).toBe(true);

      const expenses = await getExpenses();
      expect(expenses).toHaveLength(0);
    });
  });

  describe('Settlements', () => {
    it('should create and retrieve settlements', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id] });

      const settlement = await createSettlement({
        groupId: group.id,
        fromMemberId: bob.id,
        toMemberId: alice.id,
        amount: 2500,
      });

      expect(settlement.id).toBeDefined();
      expect(settlement.amount).toBe(2500);

      const groupSettlements = await getSettlementsByGroup(group.id);
      expect(groupSettlements).toHaveLength(1);
    });

    it('should delete a settlement', async () => {
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const group = await createGroup({ name: 'Trip', memberIds: [alice.id, bob.id] });

      const settlement = await createSettlement({
        groupId: group.id,
        fromMemberId: bob.id,
        toMemberId: alice.id,
        amount: 2500,
      });

      const deleted = await deleteSettlement(settlement.id);
      expect(deleted).toBe(true);

      const settlements = await getSettlements();
      expect(settlements).toHaveLength(0);
    });
  });

  describe('Integration: Full flow', () => {
    it('should handle complete expense splitting scenario', async () => {
      // Create members
      const alice = await createMember({ name: 'Alice' });
      const bob = await createMember({ name: 'Bob' });
      const charlie = await createMember({ name: 'Charlie' });

      // Create group
      const group = await createGroup({
        name: 'Paris Trip',
        memberIds: [alice.id, bob.id, charlie.id],
      });

      // Add expenses with different split types
      await createExpense({
        groupId: group.id,
        description: 'Dinner',
        amount: 6000, // $60
        paidByMemberId: alice.id,
        splitType: 'equal',
        splitDetails: [
          { memberId: alice.id, value: 1 },
          { memberId: bob.id, value: 1 },
          { memberId: charlie.id, value: 1 },
        ],
      });

      await createExpense({
        groupId: group.id,
        description: 'Hotel',
        amount: 30000, // $300
        paidByMemberId: bob.id,
        splitType: 'shares',
        splitDetails: [
          { memberId: alice.id, value: 1 },
          { memberId: bob.id, value: 2 }, // Bob had bigger room
          { memberId: charlie.id, value: 1 },
        ],
      });

      // Verify expenses
      const expenses = await getExpensesByGroup(group.id);
      expect(expenses).toHaveLength(2);

      // Record settlement
      await createSettlement({
        groupId: group.id,
        fromMemberId: charlie.id,
        toMemberId: alice.id,
        amount: 3000, // $30
      });

      // Verify settlement
      const settlements = await getSettlementsByGroup(group.id);
      expect(settlements).toHaveLength(1);
    });
  });
});
