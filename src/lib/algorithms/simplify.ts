import { MemberBalance, SimplifiedDebt } from '@/types';

/**
 * Simplify debts using a greedy algorithm.
 *
 * Algorithm:
 * 1. Separate members into creditors (positive balance) and debtors (negative balance)
 * 2. Sort creditors by balance descending
 * 3. Sort debtors by absolute balance descending
 * 4. Match largest debtor with largest creditor, settle as much as possible
 * 5. Repeat until all debts are settled
 *
 * Time complexity: O(n log n) for sorting, O(n) for matching
 *
 * @param balances - Array of member balances
 * @returns Array of simplified debts
 */
export function simplifyDebts(balances: MemberBalance[]): SimplifiedDebt[] {
  // Separate into creditors and debtors
  const creditors: { memberId: string; memberName: string; amount: number }[] =
    [];
  const debtors: { memberId: string; memberName: string; amount: number }[] = [];

  for (const balance of balances) {
    if (balance.netBalance > 0) {
      creditors.push({
        memberId: balance.memberId,
        memberName: balance.memberName,
        amount: balance.netBalance,
      });
    } else if (balance.netBalance < 0) {
      debtors.push({
        memberId: balance.memberId,
        memberName: balance.memberName,
        amount: Math.abs(balance.netBalance),
      });
    }
  }

  // Sort by amount descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const simplifiedDebts: SimplifiedDebt[] = [];

  // Use two-pointer approach to match debtors with creditors
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    // Settle the minimum of what debtor owes and what creditor is owed
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      simplifiedDebts.push({
        fromMemberId: debtor.memberId,
        fromMemberName: debtor.memberName,
        toMemberId: creditor.memberId,
        toMemberName: creditor.memberName,
        amount: settleAmount,
      });
    }

    // Update remaining amounts
    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    // Move to next debtor/creditor if fully settled
    if (debtor.amount === 0) {
      debtorIndex++;
    }
    if (creditor.amount === 0) {
      creditorIndex++;
    }
  }

  return simplifiedDebts;
}

/**
 * Verify that simplified debts correctly balance out the original balances.
 * This is useful for testing.
 *
 * @param balances - Original member balances
 * @param debts - Simplified debts
 * @returns true if debts correctly settle all balances
 */
export function verifySimplifiedDebts(
  balances: MemberBalance[],
  debts: SimplifiedDebt[]
): boolean {
  // Create a map of balances after applying debts
  const resultingBalances = new Map<string, number>();

  // Initialize with original balances
  for (const balance of balances) {
    resultingBalances.set(balance.memberId, balance.netBalance);
  }

  // Apply each debt
  for (const debt of debts) {
    // Debtor pays, their balance increases (becomes less negative)
    const fromBalance = resultingBalances.get(debt.fromMemberId) || 0;
    resultingBalances.set(debt.fromMemberId, fromBalance + debt.amount);

    // Creditor receives, their balance decreases (becomes less positive)
    const toBalance = resultingBalances.get(debt.toMemberId) || 0;
    resultingBalances.set(debt.toMemberId, toBalance - debt.amount);
  }

  // Check all balances are zero
  for (const [, balance] of resultingBalances) {
    if (balance !== 0) {
      return false;
    }
  }

  return true;
}
