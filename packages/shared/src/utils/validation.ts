/**
 * Validate a Russian domestic passport number (10 digits: SSSS NNNNNN).
 * Accepts with or without space/dash separator.
 */
export function isValidPassport(value: string): boolean {
  const cleaned = value.replace(/[\s-]/g, '');
  return /^\d{10}$/.test(cleaned);
}

/**
 * Validate a Russian phone number in +7XXXXXXXXXX format.
 * Accepts optional formatting: +7 (999) 123-45-67
 */
export function isValidPhone(value: string): boolean {
  const cleaned = value.replace(/[\s()-]/g, '');
  return /^\+7\d{10}$/.test(cleaned);
}

/**
 * Validate an email address (RFC 5322 simplified).
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
