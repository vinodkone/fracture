import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGroup, getMembersByIds, getExpensesByGroup, getSettlementsByGroup } from '@/lib/db';
import { calculateBalances } from '@/lib/algorithms/balance';
import { simplifyDebts } from '@/lib/algorithms/simplify';
import { Button } from '@/components/ui';
import { ExpenseList } from '@/components/features/ExpenseList';
import { BalanceList } from '@/components/features/BalanceList';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { groupId } = await params;
  const group = await getGroup(groupId);

  if (!group) {
    notFound();
  }

  const [members, expenses, settlements] = await Promise.all([
    getMembersByIds(group.memberIds),
    getExpensesByGroup(groupId),
    getSettlementsByGroup(groupId),
  ]);

  const memberBalances = calculateBalances(expenses, settlements, members);
  const simplifiedDebts = simplifyDebts(memberBalances);

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/groups" className="text-sm text-blue-600 hover:underline mb-2 block">
              ← Back to Groups
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-gray-600 mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/groups/${groupId}/expenses/new`}>
              <Button>Add Expense</Button>
            </Link>
            <Link href={`/groups/${groupId}/settle`}>
              <Button variant="secondary">Settle Up</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Expenses</h2>
            <ExpenseList expenses={sortedExpenses} members={members} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Balances</h2>
            <BalanceList memberBalances={memberBalances} simplifiedDebts={simplifiedDebts} />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Members</h2>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <span
                key={member.id}
                className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
              >
                {member.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
