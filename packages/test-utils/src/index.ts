export function fixedDate(offsetMs = 0): string {
  return new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0) + offsetMs).toISOString();
}

export function uuidLike(prefix: string): string {
  return `${prefix}-00000000-0000-4000-8000-000000000000`;
}
