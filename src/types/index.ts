import { z } from 'zod';

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
  splitBetweenMemberIds: z.array(z.string().uuid()).min(1),
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
  splitBetweenMemberIds: z.array(z.string().uuid()).min(1),
});

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
