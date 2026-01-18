import { simplifyDebts, verifySimplifiedDebts } from '../simplify';
import { MemberBalance } from '@/types';

describe('simplifyDebts', () => {
  it('should return empty array when all balances are zero', () => {
    const balances: MemberBalance[] = [
      { memberId: 'alice', memberName: 'Alice', netBalance: 0 },
      { memberId: 'bob', memberName: 'Bob', netBalance: 0 },
    ];

    const debts = simplifyDebts(balances);
    expect(debts).toHaveLength(0);
  });

  it('should handle simple two-person debt', () => {
    const balances: MemberBalance[] = [
      { memberId: 'alice', memberName: 'Alice', netBalance: 3000 }, // owed $30
      { memberId: 'bob', memberName: 'Bob', netBalance: -3000 }, // owes $30
    ];

    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromMemberId: 'bob',
      fromMemberName: 'Bob',
      toMemberId: 'alice',
      toMemberName: 'Alice',
      amount: 3000,
    });
  });

  it('should handle three-person debt scenario from plan', () => {
    // Alice paid $60, Bob paid $30, Charlie paid $0 (all split 3 ways)
    // Net: Alice +$30, Bob $0, Charlie -$30
    const balances: MemberBalance[] = [
      { memberId: 'alice', memberName: 'Alice', netBalance: 3000 },
      { memberId: 'bob', memberName: 'Bob', netBalance: 0 },
      { memberId: 'charlie', memberName: 'Charlie', netBalance: -3000 },
    ];

    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromMemberId: 'charlie',
      fromMemberName: 'Charlie',
      toMemberId: 'alice',
      toMemberName: 'Alice',
      amount: 3000,
    });
  });

  it('should minimize transactions for complex scenario', () => {
    // More complex: A is owed $50, B is owed $30, C owes $40, D owes $40
    const balances: MemberBalance[] = [
      { memberId: 'a', memberName: 'A', netBalance: 5000 },
      { memberId: 'b', memberName: 'B', netBalance: 3000 },
      { memberId: 'c', memberName: 'C', netBalance: -4000 },
      { memberId: 'd', memberName: 'D', netBalance: -4000 },
    ];

    const debts = simplifyDebts(balances);

    // Verify all debts settle correctly
    expect(verifySimplifiedDebts(balances, debts)).toBe(true);

    // Should have at most 3 transactions (optimal for 2 creditors, 2 debtors)
    expect(debts.length).toBeLessThanOrEqual(3);
  });

  it('should handle when one person owes multiple people', () => {
    const balances: MemberBalance[] = [
      { memberId: 'alice', memberName: 'Alice', netBalance: 2000 },
      { memberId: 'bob', memberName: 'Bob', netBalance: 1000 },
      { memberId: 'charlie', memberName: 'Charlie', netBalance: -3000 },
    ];

    const debts = simplifyDebts(balances);

    expect(verifySimplifiedDebts(balances, debts)).toBe(true);
    // Charlie should pay both Alice and Bob
    expect(debts.length).toBe(2);
  });

  it('should handle multiple debtors paying one creditor', () => {
    const balances: MemberBalance[] = [
      { memberId: 'alice', memberName: 'Alice', netBalance: 5000 },
      { memberId: 'bob', memberName: 'Bob', netBalance: -2000 },
      { memberId: 'charlie', memberName: 'Charlie', netBalance: -3000 },
    ];

    const debts = simplifyDebts(balances);

    expect(verifySimplifiedDebts(balances, debts)).toBe(true);
    expect(debts.length).toBe(2);
  });
});

describe('verifySimplifiedDebts', () => {
  it('should return true when debts correctly settle balances', () => {
    const balances: MemberBalance[] = [
      { memberId: 'alice', memberName: 'Alice', netBalance: 3000 },
      { memberId: 'bob', memberName: 'Bob', netBalance: -3000 },
    ];

    const debts = [
      {
        fromMemberId: 'bob',
        fromMemberName: 'Bob',
        toMemberId: 'alice',
        toMemberName: 'Alice',
        amount: 3000,
      },
    ];

    expect(verifySimplifiedDebts(balances, debts)).toBe(true);
  });

  it('should return false when debts do not settle balances', () => {
    const balances: MemberBalance[] = [
      { memberId: 'alice', memberName: 'Alice', netBalance: 3000 },
      { memberId: 'bob', memberName: 'Bob', netBalance: -3000 },
    ];

    const debts = [
      {
        fromMemberId: 'bob',
        fromMemberName: 'Bob',
        toMemberId: 'alice',
        toMemberName: 'Alice',
        amount: 2000, // Wrong amount
      },
    ];

    expect(verifySimplifiedDebts(balances, debts)).toBe(false);
  });
});
