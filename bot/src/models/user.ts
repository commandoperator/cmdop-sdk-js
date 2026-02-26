import { z } from 'zod/v4';

export const PermissionLevelSchema = z.enum(['NONE', 'READ', 'EXECUTE', 'FILES', 'ADMIN']);
export type PermissionLevel = z.infer<typeof PermissionLevelSchema>;

export const PERMISSION_ORDER: Record<PermissionLevel, number> = {
  NONE: 0,
  READ: 1,
  EXECUTE: 2,
  FILES: 3,
  ADMIN: 4,
};

export const UserIdentitySchema = z.object({
  platform: z.string().min(1),
  platformId: z.string().min(1),
  username: z.string().optional(),
  displayName: z.string().optional(),
});
export type UserIdentity = z.infer<typeof UserIdentitySchema>;

export const BotUserSchema = z.object({
  id: z.string().min(1),
  identity: UserIdentitySchema,
  permission: PermissionLevelSchema,
  createdAt: z.coerce.date(),
  lastSeenAt: z.coerce.date(),
});
export type BotUser = z.infer<typeof BotUserSchema>;
