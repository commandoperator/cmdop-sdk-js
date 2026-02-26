import { z } from 'zod/v4';

export const UserSessionSchema = z.object({
  userId: z.string().min(1),
  currentMachine: z.string().optional(),
  lastCommand: z.string().optional(),
  updatedAt: z.coerce.date(),
});
export type UserSession = z.infer<typeof UserSessionSchema>;

export const MachineSessionSchema = z.object({
  sessionId: z.string().min(1),
  hostname: z.string().optional(),
  status: z.enum(['online', 'offline', 'unknown']),
  connectedAt: z.coerce.date().optional(),
});
export type MachineSession = z.infer<typeof MachineSessionSchema>;
