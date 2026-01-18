import { calculateBalances, getTotalPaidByMember, getTotalOwedByMember } from '../balance';
import { Member, Expense, Settlement } from '@/types';

describe('calculateBalances', () => {
  const alice: Member = { id: 'alice-id', name: 'Alice', createdAt: '2024-01-01T00:00:00.000Z' };
  const bob: Member = { id: 'bob-id', name: 'Bob', createdAt: '2024-01-01T00:00:00.000Z' };
  const charlie: Member = { id: 'charlie-id', name: 'Charlie', createdAt: '2024-01-01T00:00:00.000Z' };
  const members = [alice, bob, charlie];

  it('should return zero balances when no expenses', () => {
    const balances = calculateBalances([], [], members);

    expect(balances).toHaveLength(3);
    balances.forEach((balance) => {
      expect(balance.netBalance).toBe(0);
    });
  });

  it('should calculate correct balance for single expense split equally', () => {
    const expense: Expense = {
      id: 'exp-1',
      groupId: 'group-1',
      description: 'Dinner',
      amount: 6000, // $60 in cents
      paidByMemberId: alice.id,
      splitBetweenMemberIds: [alice.id, bob.id, charlie.id],
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const balances = calculateBalances([expense], [], members);

    const aliceBalance = balances.find((b) => b.memberId === alice.id);
    const bobBalance = balances.find((b) => b.memberId === bob.id);
    const charlieBalance = balances.find((b) => b.memberId === charlie.id);

    // Alice paid 6000, owes 2000 -> net +4000 (is owed $40)
    expect(aliceBalance?.netBalance).toBe(4000);
    // Bob paid 0, owes 2000 -> net -2000 (owes $20)
    expect(bobBalance?.netBalance).toBe(-2000);
    // Charlie paid 0, owes 2000 -> net -2000 (owes $20)
    expect(charlieBalance?.netBalance).toBe(-2000);
  });

  it('should handle multiple expenses correctly', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        groupId: 'group-1',
        description: 'Dinner',
        amount: 6000, // $60
        paidByMemberId: alice.id,
        splitBetweenMemberIds: [alice.id, bob.id, charlie.id],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'exp-2',
        groupId: 'group-1',
        description: 'Coffee',
        amount: 3000, // $30
        paidByMemberId: bob.id,
        splitBetweenMemberIds: [alice.id, bob.id, charlie.id],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const balances = calculateBalances(expenses, [], members);

    const aliceBalance = balances.find((b) => b.memberId === alice.id);
    const bobBalance = balances.find((b) => b.memberId === bob.id);
    const charlieBalance = balances.find((b) => b.memberId === charlie.id);

    // Alice: paid 6000, owes 2000+1000=3000 -> net +3000
    expect(aliceBalance?.netBalance).toBe(3000);
    // Bob: paid 3000, owes 2000+1000=3000 -> net 0
    expect(bobBalance?.netBalance).toBe(0);
    // Charlie: paid 0, owes 2000+1000=3000 -> net -3000
    expect(charlieBalance?.netBalance).toBe(-3000);
  });

  it('should handle settlements correctly', () => {
    const expense: Expense = {
      id: 'exp-1',
      groupId: 'group-1',
      description: 'Dinner',
      amount: 6000,
      paidByMemberId: alice.id,
      splitBetweenMemberIds: [alice.id, bob.id, charlie.id],
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const settlement: Settlement = {
      id: 'set-1',
      groupId: 'group-1',
      fromMemberId: charlie.id,
      toMemberId: alice.id,
      amount: 2000, // Charlie pays Alice $20
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const balances = calculateBalances([expense], [settlement], members);

    const aliceBalance = balances.find((b) => b.memberId === alice.id);
    const bobBalance = balances.find((b) => b.memberId === bob.id);
    const charlieBalance = balances.find((b) => b.memberId === charlie.id);

    // Alice: +4000 from expense, -2000 from receiving settlement -> net +2000
    expect(aliceBalance?.netBalance).toBe(2000);
    // Bob: unchanged at -2000
    expect(bobBalance?.netBalance).toBe(-2000);
    // Charlie: -2000 from expense, +2000 from settlement -> net 0
    expect(charlieBalance?.netBalance).toBe(0);
  });

  it('should handle uneven splits correctly', () => {
    const expense: Expense = {
      id: 'exp-1',
      groupId: 'group-1',
      description: 'Dinner',
      amount: 100, // $1 = 100 cents, split 3 ways = 33 + 33 + 34
      paidByMemberId: alice.id,
      splitBetweenMemberIds: [alice.id, bob.id, charlie.id],
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const balances = calculateBalances([expense], [], members);

    const aliceBalance = balances.find((b) => b.memberId === alice.id);
    const bobBalance = balances.find((b) => b.memberId === bob.id);
    const charlieBalance = balances.find((b) => b.memberId === charlie.id);

    // 100 / 3 = 33 with remainder 1
    // First member (Alice) gets 33 + 1 = 34, others get 33
    // Alice: paid 100, owes 34 -> net +66
    expect(aliceBalance?.netBalance).toBe(66);
    // Bob: paid 0, owes 33 -> net -33
    expect(bobBalance?.netBalance).toBe(-33);
    // Charlie: paid 0, owes 33 -> net -33
    expect(charlieBalance?.netBalance).toBe(-33);
  });
});

describe('getTotalPaidByMember', () => {
  it('should return total paid by member', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        groupId: 'group-1',
        description: 'Dinner',
        amount: 6000,
        paidByMemberId: 'alice-id',
        splitBetweenMemberIds: ['alice-id', 'bob-id'],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'exp-2',
        groupId: 'group-1',
        description: 'Coffee',
        amount: 1500,
        paidByMemberId: 'alice-id',
        splitBetweenMemberIds: ['alice-id', 'bob-id'],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    expect(getTotalPaidByMember('alice-id', expenses)).toBe(7500);
    expect(getTotalPaidByMember('bob-id', expenses)).toBe(0);
  });
});

describe('getTotalOwedByMember', () => {
  it('should return total owed by member', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        groupId: 'group-1',
        description: 'Dinner',
        amount: 6000,
        paidByMemberId: 'alice-id',
        splitBetweenMemberIds: ['alice-id', 'bob-id'],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    expect(getTotalOwedByMember('alice-id', expenses)).toBe(3000);
    expect(getTotalOwedByMember('bob-id', expenses)).toBe(3000);
  });
});
