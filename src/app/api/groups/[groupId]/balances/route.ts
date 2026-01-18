import { NextRequest, NextResponse } from 'next/server';
import { getGroup, getMembersByIds, getExpensesByGroup, getSettlementsByGroup } from '@/lib/db';
import { calculateBalances } from '@/lib/algorithms/balance';
import { simplifyDebts } from '@/lib/algorithms/simplify';
import { GroupBalances } from '@/types';

type RouteParams = { params: Promise<{ groupId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { groupId } = await params;
    const group = await getGroup(groupId);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const [members, expenses, settlements] = await Promise.all([
      getMembersByIds(group.memberIds),
      getExpensesByGroup(groupId),
      getSettlementsByGroup(groupId),
    ]);

    const memberBalances = calculateBalances(expenses, settlements, members);
    const simplifiedDebts = simplifyDebts(memberBalances);

    const response: GroupBalances = {
      groupId: group.id,
      groupName: group.name,
      memberBalances,
      simplifiedDebts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating balances:', error);
    return NextResponse.json({ error: 'Failed to calculate balances' }, { status: 500 });
  }
}
