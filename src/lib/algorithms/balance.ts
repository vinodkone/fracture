import { Expense, Settlement, Member, MemberBalance } from '@/types';

/**
 * Calculate net balance for each member in a group.
 * Positive balance = member is owed money (creditor)
 * Negative balance = member owes money (debtor)
 *
 * @param expenses - All expenses for the group
 * @param settlements - All settlements for the group
 * @param members - All members in the group
 * @returns Array of MemberBalance objects
 */
export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  members: Member[]
): MemberBalance[] {
  // Initialize balances for all members
  const balanceMap = new Map<string, number>();
  members.forEach((member) => {
    balanceMap.set(member.id, 0);
  });

  // Process expenses
  for (const expense of expenses) {
    const { amount, paidByMemberId, splitBetweenMemberIds } = expense;

    // The payer paid the full amount, so they are owed that amount
    const currentPayerBalance = balanceMap.get(paidByMemberId) || 0;
    balanceMap.set(paidByMemberId, currentPayerBalance + amount);

    // Each person in the split owes their share
    const sharePerPerson = Math.floor(amount / splitBetweenMemberIds.length);
    const remainder = amount % splitBetweenMemberIds.length;

    splitBetweenMemberIds.forEach((memberId, index) => {
      // Distribute remainder to first members to handle rounding
      const share = sharePerPerson + (index < remainder ? 1 : 0);
      const currentBalance = balanceMap.get(memberId) || 0;
      balanceMap.set(memberId, currentBalance - share);
    });
  }

  // Process settlements
  for (const settlement of settlements) {
    const { fromMemberId, toMemberId, amount } = settlement;

    // fromMember paid toMember, so fromMember's debt decreases (balance increases)
    const fromBalance = balanceMap.get(fromMemberId) || 0;
    balanceMap.set(fromMemberId, fromBalance + amount);

    // toMember received money, so their credit decreases (balance decreases)
    const toBalance = balanceMap.get(toMemberId) || 0;
    balanceMap.set(toMemberId, toBalance - amount);
  }

  // Convert to MemberBalance array
  const memberBalances: MemberBalance[] = members.map((member) => ({
    memberId: member.id,
    memberName: member.name,
    netBalance: balanceMap.get(member.id) || 0,
  }));

  return memberBalances;
}

/**
 * Get total amount spent by a member in a group
 */
export function getTotalPaidByMember(
  memberId: string,
  expenses: Expense[]
): number {
  return expenses
    .filter((e) => e.paidByMemberId === memberId)
    .reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Get total amount owed by a member in a group (their share of all expenses)
 */
export function getTotalOwedByMember(
  memberId: string,
  expenses: Expense[]
): number {
  let total = 0;
  for (const expense of expenses) {
    if (expense.splitBetweenMemberIds.includes(memberId)) {
      const share = Math.floor(
        expense.amount / expense.splitBetweenMemberIds.length
      );
      total += share;
    }
  }
  return total;
}
