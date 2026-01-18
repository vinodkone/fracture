'use client';

import { MemberBalance, SimplifiedDebt } from '@/types';
import { Card, CardContent } from '@/components/ui';

interface BalanceListProps {
  memberBalances: MemberBalance[];
  simplifiedDebts: SimplifiedDebt[];
}

function formatCents(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}

export function BalanceList({ memberBalances, simplifiedDebts }: BalanceListProps) {
  const sortedBalances = [...memberBalances].sort((a, b) => b.netBalance - a.netBalance);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Member Balances</h3>
        <div className="space-y-2">
          {sortedBalances.map((balance) => (
            <div
              key={balance.memberId}
              className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg"
            >
              <span className="font-medium">{balance.memberName}</span>
              <span
                className={`font-semibold ${
                  balance.netBalance > 0
                    ? 'text-green-600'
                    : balance.netBalance < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {balance.netBalance > 0 && '+'}
                {balance.netBalance === 0 ? 'Settled' : `$${formatCents(balance.netBalance)}`}
                {balance.netBalance > 0 && ' (gets back)'}
                {balance.netBalance < 0 && ' (owes)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Simplified Settlements</h3>
        {simplifiedDebts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Everyone is settled up!</p>
        ) : (
          <div className="space-y-2">
            {simplifiedDebts.map((debt, index) => (
              <Card key={index} variant="bordered" className="p-4">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-600">{debt.fromMemberName}</span>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                      <span className="font-medium text-green-600">{debt.toMemberName}</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      ${formatCents(debt.amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
