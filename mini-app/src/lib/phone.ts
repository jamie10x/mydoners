/**
 * Normalizes an Uzbek mobile number to "+998XXXXXXXXX", accepting the forms
 * people actually type: "+998 90 123 45 67", "998901234567", "90 123 45 67",
 * with any spaces/dashes/parens. Returns null when it can't be a valid
 * Uzbek number (wrong length or non-digits left over).
 */
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().+]/g, "");
  if (!/^\d+$/.test(digits)) return null;

  let national: string;
  if (digits.length === 12 && digits.startsWith("998")) {
    national = digits.slice(3);
  } else if (digits.length === 9) {
    national = digits;
  } else {
    return null;
  }

  return `+998${national}`;
}
