import fs from 'fs/promises';
import path from 'path';
import {
  getMembers,
  createMember,
  getMember,
  updateMember,
  deleteMember,
  createGroup,
  getGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  getExpenses,
  createExpense,
  getExpensesByGroup,
  deleteExpense,
  getSettlements,
  createSettlement,
  getSettlementsByGroup,
  deleteSettlement,
} from '../index';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEST_BACKUP_DIR = path.join(process.cwd(), 'data-backup');

// Backup and restore data files for testing
async function backupData() {
  try {
    await fs.mkdir(TEST_BACKUP_DIR, { recursive: true });
    const files = ['members.json', 'groups.json', 'expenses.json', 'settlements.json'];
    for (const file of files) {
      try {
        await fs.copyFile(path.join(DATA_DIR, file), path.join(TEST_BACKUP_DIR, file));
      } catch {
        // File might not exist
      }
    }
  } catch {
    // Backup dir might exist
  }
}

async function restoreData() {
  try {
    const files = ['members.json', 'groups.json', 'expenses.json', 'settlements.json'];
    for (const file of files) {
      try {
        await fs.copyFile(path.join(TEST_BACKUP_DIR, file), path.join(DATA_DIR, file));
      } catch {
        // Restore empty array if backup doesn't exist
        await fs.writeFile(path.join(DATA_DIR, file), '[]');
      }
    }
    await fs.rm(TEST_BACKUP_DIR, { recursive: true, force: true });
  } catch {
    // Cleanup
  }
}

async function clearData() {
  const files = ['members.json', 'groups.json', 'expenses.json', 'settlements.json'];
  for (const file of files) {
    await fs.writeFile(path.join(DATA_DIR, file), '[]');
  }
}

describe('Database Layer', () => {
  beforeAll(async () => {
    await backupData();
    await clearData();
  });

  afterAll(async () => {
    await restoreData();
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

  describe('Backward Compatibility', () => {
    it('should read old expense format with splitBetweenMemberIds', async () => {
      // Write an old-format expense directly to the JSON file
      const oldFormatExpense = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        groupId: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Old Dinner',
        amount: 6000,
        paidByMemberId: '550e8400-e29b-41d4-a716-446655440002',
        splitBetweenMemberIds: [
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      await fs.writeFile(
        path.join(DATA_DIR, 'expenses.json'),
        JSON.stringify([oldFormatExpense], null, 2)
      );

      // Should be able to read the expense without error
      const expenses = await getExpenses();
      expect(expenses).toHaveLength(1);

      const expense = expenses[0];
      expect(expense.id).toBe(oldFormatExpense.id);
      expect(expense.description).toBe('Old Dinner');
      expect(expense.amount).toBe(6000);
      // Should have been migrated to new format
      expect(expense.splitType).toBe('equal');
      expect(expense.splitDetails).toHaveLength(2);
      expect(expense.splitDetails[0].memberId).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(expense.splitDetails[0].value).toBe(1);
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
