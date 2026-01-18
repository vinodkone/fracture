'use client';

import Link from 'next/link';
import { Group, Member } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface GroupCardProps {
  group: Group;
  members: Member[];
}

export function GroupCard({ group, members }: GroupCardProps) {
  const groupMembers = members.filter((m) => group.memberIds.includes(m.id));

  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {groupMembers.slice(0, 5).map((member) => (
              <span
                key={member.id}
                className="inline-block px-2 py-1 text-xs bg-gray-100 rounded-full"
              >
                {member.name}
              </span>
            ))}
            {groupMembers.length > 5 && (
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 rounded-full">
                +{groupMembers.length - 5} more
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
