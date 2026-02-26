/**
 * Base Zod utilities shared across all models
 */

import { z } from 'zod/v4';

/**
 * Create a Zod object schema that strips unknown keys.
 * Use as the base for all SDK response models.
 */
export function sdkObject<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strip();
}

export { z };
