import { Expense, Settlement, Member, MemberBalance, SplitDetail } from '@/types';

/**
 * Calculate the share for each member based on split type and details.
 * Returns a map of memberId to their share in cents.
 */
export function calculateShares(
  amount: number,
  splitType: string,
  splitDetails: SplitDetail[]
): Map<string, number> {
  const shares = new Map<string, number>();

  if (splitType === 'equal') {
    // Equal split - divide evenly
    const sharePerPerson = Math.floor(amount / splitDetails.length);
    const remainder = amount % splitDetails.length;

    splitDetails.forEach((detail, index) => {
      // Distribute remainder to first members to handle rounding
      const share = sharePerPerson + (index < remainder ? 1 : 0);
      shares.set(detail.memberId, share);
    });
  } else if (splitType === 'shares') {
    // Split by shares - proportional to share count
    const totalShares = splitDetails.reduce((sum, d) => sum + d.value, 0);

    if (totalShares === 0) {
      // Fallback to equal if no shares specified
      splitDetails.forEach((detail) => {
        shares.set(detail.memberId, Math.floor(amount / splitDetails.length));
      });
    } else {
      let distributed = 0;
      splitDetails.forEach((detail, index) => {
        if (index === splitDetails.length - 1) {
          // Last person gets remainder to ensure total is exact
          shares.set(detail.memberId, amount - distributed);
        } else {
          const share = Math.floor((amount * detail.value) / totalShares);
          shares.set(detail.memberId, share);
          distributed += share;
        }
      });
    }
  } else if (splitType === 'percentage') {
    // Split by percentage
    let distributed = 0;
    splitDetails.forEach((detail, index) => {
      if (index === splitDetails.length - 1) {
        // Last person gets remainder to ensure total is exact
        shares.set(detail.memberId, amount - distributed);
      } else {
        const share = Math.floor((amount * detail.value) / 100);
        shares.set(detail.memberId, share);
        distributed += share;
      }
    });
  }

  return shares;
}

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
    const { amount, paidByMemberId, splitType, splitDetails } = expense;

    // The payer paid the full amount, so they are owed that amount
    const currentPayerBalance = balanceMap.get(paidByMemberId) || 0;
    balanceMap.set(paidByMemberId, currentPayerBalance + amount);

    // Calculate each person's share based on split type
    const shares = calculateShares(amount, splitType, splitDetails);

    // Each person owes their share
    for (const [memberId, share] of shares) {
      const currentBalance = balanceMap.get(memberId) || 0;
      balanceMap.set(memberId, currentBalance - share);
    }
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
    const shares = calculateShares(expense.amount, expense.splitType, expense.splitDetails);
    const memberShare = shares.get(memberId);
    if (memberShare !== undefined) {
      total += memberShare;
    }
  }
  return total;
}
