/**
 * Base64 encoding/decoding utilities
 * Browser-focused implementation using btoa/atob
 */

/**
 * Encode string to base64
 * Handles Unicode strings correctly
 */
export function encodeBase64(str: string): string {
  // Handle Unicode: encode to UTF-8 bytes first
  const utf8Bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...utf8Bytes);
  return btoa(binary);
}

/**
 * Decode base64 to string
 * Handles Unicode strings correctly
 */
export function decodeBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Try to decode base64, return original string on failure
 */
export function tryDecodeBase64(str: string): string {
  try {
    return decodeBase64(str);
  } catch {
    return str;
  }
}

/**
 * Encode binary data (Uint8Array) to base64
 */
export function encodeBase64Bytes(data: Uint8Array): string {
  const binary = String.fromCharCode(...data);
  return btoa(binary);
}

/**
 * Decode base64 to binary data (Uint8Array)
 */
export function decodeBase64Bytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
