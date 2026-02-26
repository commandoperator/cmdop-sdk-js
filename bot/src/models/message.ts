import { z } from 'zod/v4';

export const AttachmentSchema = z.object({
  type: z.enum(['photo', 'document', 'audio', 'video']),
  fileId: z.string().optional(),
  url: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const IncomingMessageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channelId: z.string(),
  text: z.string(),
  timestamp: z.coerce.date(),
  attachments: z.array(AttachmentSchema).default([]),
  replyToId: z.string().optional(),
  threadId: z.string().optional(),
  raw: z.unknown().optional(),
});
export type IncomingMessage = z.infer<typeof IncomingMessageSchema>;

export const TextMessageSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});
export type TextMessage = z.infer<typeof TextMessageSchema>;

export const CodeMessageSchema = z.object({
  type: z.literal('code'),
  code: z.string(),
  language: z.string().optional(),
});
export type CodeMessage = z.infer<typeof CodeMessageSchema>;

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  hint: z.string().optional(),
});
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;

export const OutgoingMessageSchema = z.discriminatedUnion('type', [
  TextMessageSchema,
  CodeMessageSchema,
  ErrorMessageSchema,
]);
export type OutgoingMessage = z.infer<typeof OutgoingMessageSchema>;
