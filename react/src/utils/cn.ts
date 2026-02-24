/**
 * Class name utility
 * Simple utility for conditional class name merging
 */

type ClassValue = string | undefined | null | false | 0;

/**
 * Merge class names, filtering out falsy values
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
