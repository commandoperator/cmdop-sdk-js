/**
 * Files models — Zod schemas and inferred types
 */

import { z } from 'zod/v4';
import { sdkObject } from './base';

// ── File entry ─────────────────────────────────────────────────────────────

export const FileTypeSchema = z.enum(['file', 'directory', 'symlink']);
export type FileType = z.infer<typeof FileTypeSchema>;

export const FileEntrySchema = sdkObject({
  name: z.string(),
  path: z.string(),
  type: FileTypeSchema,
  size: z.number().int().min(0),
  permissions: z.string(),
  owner: z.string(),
  modifiedAt: z.date().optional(),
  isHidden: z.boolean(),
  isReadable: z.boolean(),
  isWritable: z.boolean(),
  mimeType: z.string(),
  symlinkTarget: z.string().optional(),
});

export type FileEntry = z.infer<typeof FileEntrySchema>;

// ── List ───────────────────────────────────────────────────────────────────

export const ListOptionsSchema = sdkObject({
  includeHidden: z.boolean().optional(),
  pageSize: z.number().int().positive().optional(),
  pageToken: z.string().optional(),
});

export type ListOptions = z.infer<typeof ListOptionsSchema>;

export const ListResultSchema = sdkObject({
  entries: z.array(FileEntrySchema),
  nextPageToken: z.string().optional(),
  totalCount: z.number().int().min(0),
});

export type ListResult = z.infer<typeof ListResultSchema>;

// ── Read ───────────────────────────────────────────────────────────────────

export const ReadOptionsSchema = sdkObject({
  offset: z.number().int().min(0).optional(),
  length: z.number().int().min(0).optional(),
});

export type ReadOptions = z.infer<typeof ReadOptionsSchema>;

export const ReadResultSchema = sdkObject({
  content: z.instanceof(Buffer),
  encoding: z.string(),
  totalSize: z.number().int().min(0),
  mimeType: z.string(),
  isTruncated: z.boolean(),
});

export type ReadResult = z.infer<typeof ReadResultSchema>;

// ── Write ──────────────────────────────────────────────────────────────────

export const WriteOptionsSchema = sdkObject({
  overwrite: z.boolean().optional(),
  createParents: z.boolean().optional(),
});

export type WriteOptions = z.infer<typeof WriteOptionsSchema>;

// ── Delete ─────────────────────────────────────────────────────────────────

export const DeleteOptionsSchema = sdkObject({
  recursive: z.boolean().optional(),
});

export type DeleteOptions = z.infer<typeof DeleteOptionsSchema>;

// ── Copy / Move ────────────────────────────────────────────────────────────

export const CopyOptionsSchema = sdkObject({
  overwrite: z.boolean().optional(),
  recursive: z.boolean().optional(),
});

export type CopyOptions = z.infer<typeof CopyOptionsSchema>;

export const MoveOptionsSchema = sdkObject({
  overwrite: z.boolean().optional(),
});

export type MoveOptions = z.infer<typeof MoveOptionsSchema>;

// ── Search ─────────────────────────────────────────────────────────────────

export const SearchOptionsSchema = sdkObject({
  pattern: z.string(),
  recursive: z.boolean().optional(),
  includeHidden: z.boolean().optional(),
  maxResults: z.number().int().positive().optional(),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;
