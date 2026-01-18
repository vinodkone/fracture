'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Member, SplitType, SplitDetail } from '@/types';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

interface MemberSplitState {
  memberId: string;
  selected: boolean;
  value: number;
}

export default function NewExpensePage({ params }: PageProps) {
  const { groupId } = use(params);
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [memberSplits, setMemberSplits] = useState<MemberSplitState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch(`/api/groups/${groupId}/members`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
          // Default: split between all members with value 1
          setMemberSplits(data.map((m: Member) => ({
            memberId: m.id,
            selected: true,
            value: splitType === 'percentage' ? Math.floor(100 / data.length) : 1,
          })));
        }
      } catch (err) {
        console.error('Failed to fetch members:', err);
      }
    }
    fetchMembers();
  }, [groupId]);

  // Update default values when split type changes
  useEffect(() => {
    if (members.length === 0) return;

    const selectedMembers = memberSplits.filter(m => m.selected);
    const selectedCount = selectedMembers.length || 1;

    setMemberSplits(prev => prev.map(ms => ({
      ...ms,
      value: splitType === 'percentage'
        ? (ms.selected ? Math.floor(100 / selectedCount) : 0)
        : 1,
    })));
  }, [splitType]);

  const toggleMemberSplit = (memberId: string) => {
    setMemberSplits(prev => {
      const updated = prev.map(ms =>
        ms.memberId === memberId ? { ...ms, selected: !ms.selected } : ms
      );

      // For percentage split, redistribute evenly among selected members
      if (splitType === 'percentage') {
        const selectedCount = updated.filter(m => m.selected).length || 1;
        const evenPercentage = Math.floor(100 / selectedCount);
        return updated.map(ms => ({
          ...ms,
          value: ms.selected ? evenPercentage : 0,
        }));
      }

      return updated;
    });
  };

  const updateMemberValue = (memberId: string, value: number) => {
    setMemberSplits(prev => prev.map(ms =>
      ms.memberId === memberId ? { ...ms, value } : ms
    ));
  };

  const getSelectedSplitDetails = (): SplitDetail[] => {
    return memberSplits
      .filter(ms => ms.selected)
      .map(ms => ({ memberId: ms.memberId, value: ms.value }));
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

      const splitDetails = getSelectedSplitDetails();
      if (splitDetails.length === 0) {
        setError('Please select at least one person to split with');
        setIsLoading(false);
        return;
      }

      // Validate percentage adds up to 100
      if (splitType === 'percentage') {
        const total = splitDetails.reduce((sum, d) => sum + d.value, 0);
        if (Math.abs(total - 100) > 0.01) {
          setError(`Percentages must add up to 100% (currently ${total}%)`);
          setIsLoading(false);
          return;
        }
      }

      // Validate shares are positive
      if (splitType === 'shares') {
        const hasInvalidShares = splitDetails.some(d => d.value <= 0);
        if (hasInvalidShares) {
          setError('All shares must be greater than 0');
          setIsLoading(false);
          return;
        }
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          description,
          amount: amountInCents,
          paidByMemberId,
          splitType,
          splitDetails,
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

  const calculatePerPersonAmount = (memberId: string): string => {
    if (!amount) return '0.00';
    const amountNum = parseFloat(amount);
    const splitDetails = getSelectedSplitDetails();
    const memberSplit = splitDetails.find(d => d.memberId === memberId);

    if (!memberSplit) return '0.00';

    if (splitType === 'equal') {
      return (amountNum / splitDetails.length).toFixed(2);
    } else if (splitType === 'shares') {
      const totalShares = splitDetails.reduce((sum, d) => sum + d.value, 0);
      if (totalShares === 0) return '0.00';
      return ((amountNum * memberSplit.value) / totalShares).toFixed(2);
    } else if (splitType === 'percentage') {
      return ((amountNum * memberSplit.value) / 100).toFixed(2);
    }
    return '0.00';
  };

  const getTotalPercentage = (): number => {
    return memberSplits
      .filter(ms => ms.selected)
      .reduce((sum, ms) => sum + ms.value, 0);
  };

  const getTotalShares = (): number => {
    return memberSplits
      .filter(ms => ms.selected)
      .reduce((sum, ms) => sum + ms.value, 0);
  };

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

              <Select
                label="Split type"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as SplitType)}
                options={[
                  { value: 'equal', label: 'Equal split' },
                  { value: 'shares', label: 'By shares' },
                  { value: 'percentage', label: 'By percentage' },
                ]}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Split between
                  {splitType === 'percentage' && (
                    <span className={`ml-2 text-xs ${getTotalPercentage() === 100 ? 'text-green-600' : 'text-red-600'}`}>
                      (Total: {getTotalPercentage()}%)
                    </span>
                  )}
                  {splitType === 'shares' && (
                    <span className="ml-2 text-xs text-gray-500">
                      (Total: {getTotalShares()} shares)
                    </span>
                  )}
                </label>
                <div className="space-y-2">
                  {members.map((member) => {
                    const memberSplit = memberSplits.find(ms => ms.memberId === member.id);
                    const isSelected = memberSplit?.selected ?? false;
                    const splitValue = memberSplit?.value ?? 1;

                    return (
                      <div
                        key={member.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isSelected ? 'bg-blue-50' : 'bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMemberSplit(member.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="flex-1">{member.name}</span>

                        {splitType !== 'equal' && isSelected && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step={splitType === 'percentage' ? '1' : '1'}
                              value={splitValue}
                              onChange={(e) => updateMemberValue(member.id, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-sm text-gray-500">
                              {splitType === 'percentage' ? '%' : 'shares'}
                            </span>
                          </div>
                        )}

                        {isSelected && amount && (
                          <span className="text-sm font-medium text-gray-700">
                            ${calculatePerPersonAmount(member.id)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
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
