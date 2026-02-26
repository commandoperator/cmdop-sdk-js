import { PermissionDeniedError } from '../errors.js';
import type { PermissionLevel, PermissionStoreProtocol } from './types.js';
import { PERMISSION_ORDER } from '../models/user.js';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store (default, no persistence)
// ─────────────────────────────────────────────────────────────────────────────

export class InMemoryPermissionStore implements PermissionStoreProtocol {
  private readonly store = new Map<string, PermissionLevel>();

  constructor(seed: Record<string, PermissionLevel> = {}) {
    for (const [id, level] of Object.entries(seed)) {
      this.store.set(id, level);
    }
  }

  async getLevel(userId: string): Promise<PermissionLevel> {
    return this.store.get(userId) ?? 'NONE';
  }

  async setLevel(userId: string, level: PermissionLevel): Promise<void> {
    this.store.set(userId, level);
  }

  async deleteUser(userId: string): Promise<void> {
    this.store.delete(userId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-channel identity map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps platform-scoped user IDs to a single canonical user ID.
 *
 * Platform IDs are namespaced as `"<channel>:<userId>"` (e.g. `"telegram:12345"`).
 * When a user is linked, all their platform IDs resolve to the same canonical ID,
 * so a permission granted on Telegram automatically applies on Discord and Slack.
 *
 * Example:
 *   map.link('telegram:12345', 'discord:67890');
 *   map.resolve('discord:67890') // → 'telegram:12345'  (canonical = first linked)
 */
export class IdentityMap {
  // Maps any platform ID → canonical ID
  private readonly links = new Map<string, string>();

  /**
   * Build a namespaced platform ID.
   */
  static platformId(channel: string, userId: string): string {
    return `${channel}:${userId}`;
  }

  /**
   * Link two platform IDs together.
   * The first ID becomes (or joins) the canonical identity for the group.
   * Both IDs resolve to the same canonical ID after linking.
   */
  link(idA: string, idB: string): void {
    const canonA = this.resolve(idA);
    const canonB = this.resolve(idB);
    if (canonA === canonB) return; // already the same identity

    // Merge B's group into A's canonical
    for (const [key, val] of this.links.entries()) {
      if (val === canonB) this.links.set(key, canonA);
    }
    this.links.set(idB, canonA);
    if (!this.links.has(idA)) this.links.set(idA, canonA);
  }

  /**
   * Resolve a platform ID to its canonical ID.
   * Returns the original ID if no link exists (it is its own canonical).
   */
  resolve(id: string): string {
    return this.links.get(id) ?? id;
  }

  /**
   * Remove all links for a given platform ID.
   * The canonical group still exists — only this ID is unlinked.
   */
  unlink(id: string): void {
    this.links.delete(id);
  }

  /**
   * True if the two IDs resolve to the same canonical identity.
   */
  areSameIdentity(idA: string, idB: string): boolean {
    return this.resolve(idA) === this.resolve(idB);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Manager
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionManagerOptions {
  adminUsers?: string[];
  defaultLevel?: PermissionLevel;
  /** Cross-channel identity map. Shared across all channels in an IntegrationHub. */
  identityMap?: IdentityMap;
}

export class PermissionManager {
  private readonly adminSet: Set<string>;
  private readonly defaultLevel: PermissionLevel;
  private readonly identityMap: IdentityMap;

  constructor(
    private readonly store: PermissionStoreProtocol,
    options: PermissionManagerOptions = {},
  ) {
    this.adminSet = new Set(options.adminUsers ?? []);
    this.defaultLevel = options.defaultLevel ?? 'NONE';
    this.identityMap = options.identityMap ?? new IdentityMap();
  }

  /**
   * Get the effective permission level for a user.
   * Resolves cross-channel identity before looking up the store.
   */
  async getLevel(userId: string): Promise<PermissionLevel> {
    const canonical = this.identityMap.resolve(userId);
    if (this.adminSet.has(canonical) || this.adminSet.has(userId)) return 'ADMIN';
    const stored = await this.store.getLevel(canonical);
    if (stored !== 'NONE') return stored;
    return this.defaultLevel;
  }

  async setLevel(userId: string, level: PermissionLevel): Promise<void> {
    // Always store under the canonical ID so all linked IDs share the level
    const canonical = this.identityMap.resolve(userId);
    await this.store.setLevel(canonical, level);
  }

  async deleteUser(userId: string): Promise<void> {
    const canonical = this.identityMap.resolve(userId);
    await this.store.deleteUser(canonical);
  }

  /**
   * Throws PermissionDeniedError if user doesn't have required level.
   */
  async checkPermission(userId: string, required: PermissionLevel): Promise<void> {
    const actual = await this.getLevel(userId);
    if (PERMISSION_ORDER[actual] < PERMISSION_ORDER[required]) {
      throw new PermissionDeniedError(userId, required);
    }
  }

  async hasPermission(userId: string, required: PermissionLevel): Promise<boolean> {
    const actual = await this.getLevel(userId);
    return PERMISSION_ORDER[actual] >= PERMISSION_ORDER[required];
  }

  /** Expose the identity map for cross-channel linking at the hub level. */
  get identity(): IdentityMap {
    return this.identityMap;
  }
}
