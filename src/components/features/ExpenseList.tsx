'use client';

import { Expense, Member, SplitType } from '@/types';
import { Card, CardContent } from '@/components/ui';

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  onDelete?: (id: string) => void;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSplitType(splitType: SplitType): string {
  switch (splitType) {
    case 'equal':
      return 'Equal split';
    case 'shares':
      return 'By shares';
    case 'percentage':
      return 'By percentage';
    default:
      return 'Split';
  }
}

export function ExpenseList({ expenses, members, onDelete }: ExpenseListProps) {
  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member?.name || 'Unknown';
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No expenses yet. Add your first expense!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <Card key={expense.id} variant="bordered" className="p-4">
          <CardContent>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900">{expense.description}</h4>
                <p className="text-sm text-gray-600">
                  Paid by {getMemberName(expense.paidByMemberId)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatSplitType(expense.splitType)} • {expense.splitDetails.length} {expense.splitDetails.length === 1 ? 'person' : 'people'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  ${formatCents(expense.amount)}
                </p>
                <p className="text-xs text-gray-500">{formatDate(expense.createdAt)}</p>
                {onDelete && (
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="mt-2 text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
