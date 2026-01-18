'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export default function NewGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const addMemberField = () => {
    setMemberNames([...memberNames, '']);
  };

  const updateMemberName = (index: number, value: string) => {
    const updated = [...memberNames];
    updated[index] = value;
    setMemberNames(updated);
  };

  const removeMemberField = (index: number) => {
    if (memberNames.length > 1) {
      setMemberNames(memberNames.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Filter out empty member names
      const validMemberNames = memberNames.filter((name) => name.trim() !== '');

      if (!groupName.trim()) {
        setError('Group name is required');
        setIsLoading(false);
        return;
      }

      if (validMemberNames.length === 0) {
        setError('At least one member is required');
        setIsLoading(false);
        return;
      }

      // Create members first
      const memberIds: string[] = [];
      for (const name of validMemberNames) {
        const res = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!res.ok) {
          throw new Error('Failed to create member');
        }

        const member = await res.json();
        memberIds.push(member.id);
      }

      // Create group with member IDs
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, memberIds }),
      });

      if (!res.ok) {
        throw new Error('Failed to create group');
      }

      const group = await res.json();
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Group</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Trip to Paris, Roommates"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Members
                </label>
                <div className="space-y-2">
                  {memberNames.map((name, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={name}
                        onChange={(e) => updateMemberName(index, e.target.value)}
                        placeholder={`Member ${index + 1} name`}
                      />
                      {memberNames.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeMemberField(index)}
                          className="px-3"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addMemberField}
                  className="mt-2"
                  size="sm"
                >
                  + Add Member
                </Button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" isLoading={isLoading}>
                  Create Group
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
