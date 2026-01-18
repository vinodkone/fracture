'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Member } from '@/types';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default function NewExpensePage({ params }: PageProps) {
  const { groupId } = use(params);
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [splitBetweenMemberIds, setSplitBetweenMemberIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch(`/api/groups/${groupId}/members`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
          // Default: split between all members
          setSplitBetweenMemberIds(data.map((m: Member) => m.id));
        }
      } catch (err) {
        console.error('Failed to fetch members:', err);
      }
    }
    fetchMembers();
  }, [groupId]);

  const toggleMemberSplit = (memberId: string) => {
    if (splitBetweenMemberIds.includes(memberId)) {
      setSplitBetweenMemberIds(splitBetweenMemberIds.filter((id) => id !== memberId));
    } else {
      setSplitBetweenMemberIds([...splitBetweenMemberIds, memberId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!description.trim()) {
        setError('Description is required');
        setIsLoading(false);
        return;
      }

      const amountInCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountInCents) || amountInCents <= 0) {
        setError('Please enter a valid amount');
        setIsLoading(false);
        return;
      }

      if (!paidByMemberId) {
        setError('Please select who paid');
        setIsLoading(false);
        return;
      }

      if (splitBetweenMemberIds.length === 0) {
        setError('Please select at least one person to split with');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          description,
          amount: amountInCents,
          paidByMemberId,
          splitBetweenMemberIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create expense');
      }

      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const perPersonAmount =
    splitBetweenMemberIds.length > 0 && amount
      ? (parseFloat(amount) / splitBetweenMemberIds.length).toFixed(2)
      : '0.00';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Add New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Dinner at restaurant"
                required
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

              <Select
                label="Paid by"
                value={paidByMemberId}
                onChange={(e) => setPaidByMemberId(e.target.value)}
                options={members.map((m) => ({ value: m.id, label: m.name }))}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Split between
                </label>
                <div className="space-y-2">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={splitBetweenMemberIds.includes(member.id)}
                        onChange={() => toggleMemberSplit(member.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="flex-1">{member.name}</span>
                      {splitBetweenMemberIds.includes(member.id) && amount && (
                        <span className="text-sm text-gray-600">${perPersonAmount}</span>
                      )}
                    </label>
                  ))}
                </div>
                {splitBetweenMemberIds.length > 0 && amount && (
                  <p className="mt-2 text-sm text-gray-600">
                    ${perPersonAmount} per person ({splitBetweenMemberIds.length} people)
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" isLoading={isLoading}>
                  Add Expense
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
