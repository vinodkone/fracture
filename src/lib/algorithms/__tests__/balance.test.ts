import { calculateBalances, calculateShares, getTotalPaidByMember, getTotalOwedByMember } from '../balance';
import { Member, Expense, Settlement, SplitDetail } from '@/types';

describe('calculateShares', () => {
  it('should calculate equal shares correctly', () => {
    const splitDetails: SplitDetail[] = [
      { memberId: 'a', value: 1 },
      { memberId: 'b', value: 1 },
      { memberId: 'c', value: 1 },
    ];

    const shares = calculateShares(6000, 'equal', splitDetails);

    expect(shares.get('a')).toBe(2000);
    expect(shares.get('b')).toBe(2000);
    expect(shares.get('c')).toBe(2000);
  });

  it('should handle equal split with remainder', () => {
    const splitDetails: SplitDetail[] = [
      { memberId: 'a', value: 1 },
      { memberId: 'b', value: 1 },
      { memberId: 'c', value: 1 },
    ];

    const shares = calculateShares(100, 'equal', splitDetails);

    // 100 / 3 = 33 with remainder 1
    expect(shares.get('a')).toBe(34); // Gets the extra cent
    expect(shares.get('b')).toBe(33);
    expect(shares.get('c')).toBe(33);
  });

  it('should calculate shares by proportion correctly', () => {
    const splitDetails: SplitDetail[] = [
      { memberId: 'a', value: 2 }, // 2 shares
      { memberId: 'b', value: 1 }, // 1 share
    ];

    const shares = calculateShares(3000, 'shares', splitDetails);

    // Total 3 shares: a gets 2/3, b gets 1/3
    expect(shares.get('a')).toBe(2000);
    expect(shares.get('b')).toBe(1000);
  });

  it('should calculate percentage split correctly', () => {
    const splitDetails: SplitDetail[] = [
      { memberId: 'a', value: 70 }, // 70%
      { memberId: 'b', value: 30 }, // 30%
    ];

    const shares = calculateShares(10000, 'percentage', splitDetails);

    expect(shares.get('a')).toBe(7000);
    expect(shares.get('b')).toBe(3000);
  });

  it('should handle percentage rounding correctly', () => {
    const splitDetails: SplitDetail[] = [
      { memberId: 'a', value: 33.33 },
      { memberId: 'b', value: 33.33 },
      { memberId: 'c', value: 33.34 },
    ];

    const shares = calculateShares(10000, 'percentage', splitDetails);

    // Should distribute correctly even with rounding
    const total = (shares.get('a') || 0) + (shares.get('b') || 0) + (shares.get('c') || 0);
    expect(total).toBe(10000);
  });
});

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

  it('should calculate correct balance for equal split', () => {
    const expense: Expense = {
      id: 'exp-1',
      groupId: 'group-1',
      description: 'Dinner',
      amount: 6000, // $60 in cents
      paidByMemberId: alice.id,
      splitType: 'equal',
      splitDetails: [
        { memberId: alice.id, value: 1 },
        { memberId: bob.id, value: 1 },
        { memberId: charlie.id, value: 1 },
      ],
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

  it('should calculate correct balance for shares split', () => {
    const expense: Expense = {
      id: 'exp-1',
      groupId: 'group-1',
      description: 'Dinner',
      amount: 6000,
      paidByMemberId: alice.id,
      splitType: 'shares',
      splitDetails: [
        { memberId: alice.id, value: 1 }, // 1 share
        { memberId: bob.id, value: 2 },   // 2 shares
        { memberId: charlie.id, value: 3 }, // 3 shares
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const balances = calculateBalances([expense], [], members);

    // Total 6 shares, amount 6000
    // Alice: 1/6 = 1000
    // Bob: 2/6 = 2000
    // Charlie: 3/6 = 3000
    const aliceBalance = balances.find((b) => b.memberId === alice.id);
    const bobBalance = balances.find((b) => b.memberId === bob.id);
    const charlieBalance = balances.find((b) => b.memberId === charlie.id);

    // Alice paid 6000, owes 1000 -> net +5000
    expect(aliceBalance?.netBalance).toBe(5000);
    // Bob paid 0, owes 2000 -> net -2000
    expect(bobBalance?.netBalance).toBe(-2000);
    // Charlie paid 0, owes 3000 -> net -3000
    expect(charlieBalance?.netBalance).toBe(-3000);
  });

  it('should calculate correct balance for percentage split', () => {
    const expense: Expense = {
      id: 'exp-1',
      groupId: 'group-1',
      description: 'Dinner',
      amount: 10000,
      paidByMemberId: alice.id,
      splitType: 'percentage',
      splitDetails: [
        { memberId: alice.id, value: 50 },  // 50%
        { memberId: bob.id, value: 30 },    // 30%
        { memberId: charlie.id, value: 20 }, // 20%
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const balances = calculateBalances([expense], [], members);

    const aliceBalance = balances.find((b) => b.memberId === alice.id);
    const bobBalance = balances.find((b) => b.memberId === bob.id);
    const charlieBalance = balances.find((b) => b.memberId === charlie.id);

    // Alice paid 10000, owes 5000 -> net +5000
    expect(aliceBalance?.netBalance).toBe(5000);
    // Bob paid 0, owes 3000 -> net -3000
    expect(bobBalance?.netBalance).toBe(-3000);
    // Charlie paid 0, owes 2000 -> net -2000
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
        splitType: 'equal',
        splitDetails: [
          { memberId: alice.id, value: 1 },
          { memberId: bob.id, value: 1 },
          { memberId: charlie.id, value: 1 },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'exp-2',
        groupId: 'group-1',
        description: 'Coffee',
        amount: 3000, // $30
        paidByMemberId: bob.id,
        splitType: 'equal',
        splitDetails: [
          { memberId: alice.id, value: 1 },
          { memberId: bob.id, value: 1 },
          { memberId: charlie.id, value: 1 },
        ],
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
      splitType: 'equal',
      splitDetails: [
        { memberId: alice.id, value: 1 },
        { memberId: bob.id, value: 1 },
        { memberId: charlie.id, value: 1 },
      ],
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
        splitType: 'equal',
        splitDetails: [
          { memberId: 'alice-id', value: 1 },
          { memberId: 'bob-id', value: 1 },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'exp-2',
        groupId: 'group-1',
        description: 'Coffee',
        amount: 1500,
        paidByMemberId: 'alice-id',
        splitType: 'equal',
        splitDetails: [
          { memberId: 'alice-id', value: 1 },
          { memberId: 'bob-id', value: 1 },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    expect(getTotalPaidByMember('alice-id', expenses)).toBe(7500);
    expect(getTotalPaidByMember('bob-id', expenses)).toBe(0);
  });
});

describe('getTotalOwedByMember', () => {
  it('should return total owed by member with equal split', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        groupId: 'group-1',
        description: 'Dinner',
        amount: 6000,
        paidByMemberId: 'alice-id',
        splitType: 'equal',
        splitDetails: [
          { memberId: 'alice-id', value: 1 },
          { memberId: 'bob-id', value: 1 },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    expect(getTotalOwedByMember('alice-id', expenses)).toBe(3000);
    expect(getTotalOwedByMember('bob-id', expenses)).toBe(3000);
  });

  it('should return total owed with percentage split', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        groupId: 'group-1',
        description: 'Dinner',
        amount: 10000,
        paidByMemberId: 'alice-id',
        splitType: 'percentage',
        splitDetails: [
          { memberId: 'alice-id', value: 60 },
          { memberId: 'bob-id', value: 40 },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    expect(getTotalOwedByMember('alice-id', expenses)).toBe(6000);
    expect(getTotalOwedByMember('bob-id', expenses)).toBe(4000);
  });
});
