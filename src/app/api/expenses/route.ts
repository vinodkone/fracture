import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, getExpensesByGroup, createExpense, getExpense, updateExpense, deleteExpense, getGroup } from '@/lib/db';
import { CreateExpenseSchema } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (groupId) {
      const expenses = await getExpensesByGroup(groupId);
      return NextResponse.json(expenses);
    }

    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateExpenseSchema.safeParse(body);

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

    // Validate payer is in group
    if (!group.memberIds.includes(parsed.data.paidByMemberId)) {
      return NextResponse.json(
        { error: 'Payer must be a member of the group' },
        { status: 400 }
      );
    }

    // Validate all split members are in group
    const invalidMembers = parsed.data.splitBetweenMemberIds.filter(
      (id) => !group.memberIds.includes(id)
    );
    if (invalidMembers.length > 0) {
      return NextResponse.json(
        { error: 'All split members must be members of the group' },
        { status: 400 }
      );
    }

    const expense = await createExpense(parsed.data);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = CreateExpenseSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const expense = await updateExpense(id, parsed.data);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const deleted = await deleteExpense(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
