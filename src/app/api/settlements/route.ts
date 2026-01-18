import { NextRequest, NextResponse } from 'next/server';
import { getSettlements, getSettlementsByGroup, createSettlement, deleteSettlement, getGroup } from '@/lib/db';
import { CreateSettlementSchema } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (groupId) {
      const settlements = await getSettlementsByGroup(groupId);
      return NextResponse.json(settlements);
    }

    const settlements = await getSettlements();
    return NextResponse.json(settlements);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateSettlementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Validate group exists
    const group = await getGroup(parsed.data.groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Validate both members are in group
    if (!group.memberIds.includes(parsed.data.fromMemberId)) {
      return NextResponse.json(
        { error: 'From member must be a member of the group' },
        { status: 400 }
      );
    }

    if (!group.memberIds.includes(parsed.data.toMemberId)) {
      return NextResponse.json(
        { error: 'To member must be a member of the group' },
        { status: 400 }
      );
    }

    // Validate from and to are different
    if (parsed.data.fromMemberId === parsed.data.toMemberId) {
      return NextResponse.json(
        { error: 'Cannot settle with yourself' },
        { status: 400 }
      );
    }

    const settlement = await createSettlement(parsed.data);
    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    console.error('Error creating settlement:', error);
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Settlement ID is required' }, { status: 400 });
    }

    const deleted = await deleteSettlement(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting settlement:', error);
    return NextResponse.json({ error: 'Failed to delete settlement' }, { status: 500 });
  }
}
