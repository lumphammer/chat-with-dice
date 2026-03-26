export type Alphanumeric = string & { readonly __brand: unique symbol };

export function isAlphanumeric(value: string): value is Alphanumeric {
  return /^[a-zA-Z0-9]+$/.test(value);
}

export function toAlphanumeric(value: string): Alphanumeric {
  if (!isAlphanumeric(value)) {
    throw new Error(`"${value}" is not alphanumeric`);
  }
  return value;
}
