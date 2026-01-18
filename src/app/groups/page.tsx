import Link from 'next/link';
import { getGroups, getMembers } from '@/lib/db';
import { GroupCard } from '@/components/features/GroupCard';
import { Button } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const [groups, members] = await Promise.all([getGroups(), getMembers()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          <Link href="/groups/new">
            <Button>Create Group</Button>
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-600 mb-4">
              No groups yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create your first group to start splitting expenses!
            </p>
            <Link href="/groups/new">
              <Button size="lg">Create Your First Group</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} members={members} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
