import { z } from 'zod';

// User schema for authenticated users
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().url().nullable(),
  googleId: z.string(),
  linkedMemberIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// Input schema for creating new users
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().url().nullable(),
  googleId: z.string(),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

// Input schema for updating users
export const UpdateUserSchema = z.object({
  name: z.string().nullable().optional(),
  image: z.string().url().nullable().optional(),
  linkedMemberIds: z.array(z.string().uuid()).optional(),
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
