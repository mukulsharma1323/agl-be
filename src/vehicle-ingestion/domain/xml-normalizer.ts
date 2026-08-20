export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function requiredNumber(value: unknown, fieldName: string): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Invalid numeric field: ${fieldName}`);
  }

  return numberValue;
}

export function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid string field: ${fieldName}`);
  }

  return value.trim();
}
