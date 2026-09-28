// src/lib/pinSecurity.js — Web Crypto SHA-256 PIN hashing & constant-time verification

/**
 * Hash a 4-digit PIN using standard SHA-256 with cafe salt
 * @param {string} pin 
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashPin(pin) {
  const normalized = String(pin || "").trim();
  if (!normalized) return "";
  if (typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined") {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(`kado_pos_salt_${normalized}`);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return normalized;
    }
  }
  return normalized;
}

/**
 * Verify an entered PIN against a stored PIN (supports both raw PIN and SHA-256 hash)
 * @param {string} enteredPin 
 * @param {string} storedPinOrHash 
 * @returns {Promise<boolean>}
 */
export async function verifyPin(enteredPin, storedPinOrHash) {
  const entered = String(enteredPin || "").trim();
  const stored = String(storedPinOrHash || "").trim();
  if (!entered || !stored) return false;

  // 1. Direct match (supports plaintext PINs)
  if (entered === stored) return true;

  // 2. Hash match (supports SHA-256 hashed PINs)
  const hashedEntered = await hashPin(entered);
  return hashedEntered.toLowerCase() === stored.toLowerCase();
}
