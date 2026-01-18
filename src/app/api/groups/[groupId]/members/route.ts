import { NextRequest, NextResponse } from 'next/server';
import { addMemberToGroup, removeMemberFromGroup, getGroup, getMembersByIds } from '@/lib/db';
import { z } from 'zod';

const MemberIdSchema = z.object({
  memberId: z.string().uuid(),
});

type RouteParams = { params: Promise<{ groupId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { groupId } = await params;
    const group = await getGroup(groupId);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const members = await getMembersByIds(group.memberIds);
    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const parsed = MemberIdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const group = await addMemberToGroup(groupId, parsed.data.memberId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error adding member to group:', error);
    return NextResponse.json({ error: 'Failed to add member to group' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const group = await removeMemberFromGroup(groupId, memberId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error removing member from group:', error);
    return NextResponse.json({ error: 'Failed to remove member from group' }, { status: 500 });
  }
}
