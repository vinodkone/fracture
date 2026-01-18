import { z } from 'zod';

// Split types
export const SplitType = z.enum(['equal', 'shares', 'percentage']);
export type SplitType = z.infer<typeof SplitType>;

// Split detail for a member
export const SplitDetailSchema = z.object({
  memberId: z.string().uuid(),
  value: z.number().nonnegative(), // shares count or percentage (0-100)
});
export type SplitDetail = z.infer<typeof SplitDetailSchema>;

// Base schemas
export const MemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
});

export const GroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
});

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(), // Amount in cents
  paidByMemberId: z.string().uuid(),
  splitType: SplitType.default('equal'),
  splitDetails: z.array(SplitDetailSchema).min(1), // Member splits
  createdAt: z.string().datetime(),
});

export const SettlementSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amount: z.number().int().positive(), // Amount in cents
  createdAt: z.string().datetime(),
});

// Types derived from schemas
export type Member = z.infer<typeof MemberSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Expense = z.infer<typeof ExpenseSchema>;
export type Settlement = z.infer<typeof SettlementSchema>;

// Input schemas for creating new entities
export const CreateMemberSchema = z.object({
  name: z.string().min(1).max(100),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});

export const CreateExpenseSchema = z.object({
  groupId: z.string().uuid(),
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  paidByMemberId: z.string().uuid(),
  splitType: SplitType.default('equal'),
  splitDetails: z.array(SplitDetailSchema).min(1),
}).refine(
  (data) => {
    if (data.splitType === 'percentage') {
      const total = data.splitDetails.reduce((sum, d) => sum + d.value, 0);
      return Math.abs(total - 100) < 0.01; // Allow small floating point errors
    }
    return true;
  },
  { message: 'Percentages must add up to 100%' }
);

export const CreateSettlementSchema = z.object({
  groupId: z.string().uuid(),
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amount: z.number().int().positive(),
});

export type CreateMember = z.infer<typeof CreateMemberSchema>;
export type CreateGroup = z.infer<typeof CreateGroupSchema>;
export type CreateExpense = z.infer<typeof CreateExpenseSchema>;
export type CreateSettlement = z.infer<typeof CreateSettlementSchema>;

// Balance types
export interface MemberBalance {
  memberId: string;
  memberName: string;
  netBalance: number; // Positive = owed money, Negative = owes money
}

export interface SimplifiedDebt {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number; // Amount in cents
}

export interface GroupBalances {
  groupId: string;
  groupName: string;
  memberBalances: MemberBalance[];
  simplifiedDebts: SimplifiedDebt[];
}

// Helper to convert old format (splitBetweenMemberIds) to new format (splitDetails)
export function convertToSplitDetails(memberIds: string[]): SplitDetail[] {
  return memberIds.map((memberId) => ({
    memberId,
    value: 1, // Equal share
  }));
}

// Helper to get member IDs from split details
export function getMemberIdsFromSplitDetails(splitDetails: SplitDetail[]): string[] {
  return splitDetails.map((d) => d.memberId);
}
