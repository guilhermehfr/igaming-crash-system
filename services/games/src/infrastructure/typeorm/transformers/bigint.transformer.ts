export const BigIntTransformer = {
  to: (value: bigint | null | undefined): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return value.toString();
  },
  from: (value: string | null | undefined): bigint | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return BigInt(value);
  },
};
