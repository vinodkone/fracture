'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Member, SimplifiedDebt } from '@/types';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default function SettlePage({ params }: PageProps) {
  const { groupId } = use(params);
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[]>([]);
  const [fromMemberId, setFromMemberId] = useState('');
  const [toMemberId, setToMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [membersRes, balancesRes] = await Promise.all([
          fetch(`/api/groups/${groupId}/members`),
          fetch(`/api/groups/${groupId}/balances`),
        ]);

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }

        if (balancesRes.ok) {
          const balancesData = await balancesRes.json();
          setSimplifiedDebts(balancesData.simplifiedDebts);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    }
    fetchData();
  }, [groupId]);

  const handleQuickSettle = (debt: SimplifiedDebt) => {
    setFromMemberId(debt.fromMemberId);
    setToMemberId(debt.toMemberId);
    setAmount((debt.amount / 100).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountInCents) || amountInCents <= 0) {
        setError('Please enter a valid amount');
        setIsLoading(false);
        return;
      }

      if (!fromMemberId || !toMemberId) {
        setError('Please select both members');
        setIsLoading(false);
        return;
      }

      if (fromMemberId === toMemberId) {
        setError('Cannot settle with yourself');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          fromMemberId,
          toMemberId,
          amount: amountInCents,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record settlement');
      }

      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCents = (cents: number) => (cents / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Settle Up</CardTitle>
          </CardHeader>
          <CardContent>
            {simplifiedDebts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Suggested Settlements
                </h3>
                <div className="space-y-2">
                  {simplifiedDebts.map((debt, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleQuickSettle(debt)}
                      className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span>
                          <span className="font-medium">{debt.fromMemberName}</span>
                          {' → '}
                          <span className="font-medium">{debt.toMemberName}</span>
                        </span>
                        <span className="font-semibold text-blue-600">
                          ${formatCents(debt.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {simplifiedDebts.length === 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                Everyone is settled up! No payments needed.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Select
                label="Who is paying"
                value={fromMemberId}
                onChange={(e) => setFromMemberId(e.target.value)}
                options={members.map((m) => ({ value: m.id, label: m.name }))}
              />

              <Select
                label="Who is receiving"
                value={toMemberId}
                onChange={(e) => setToMemberId(e.target.value)}
                options={members.map((m) => ({ value: m.id, label: m.name }))}
              />

              <Input
                label="Amount ($)"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />

              <div className="flex gap-3 pt-4">
                <Button type="submit" isLoading={isLoading}>
                  Record Settlement
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
