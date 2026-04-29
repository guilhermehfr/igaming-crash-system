/**
 * BigInt Transformer for TypeORM
 * 
 * TypeORM stores bigint as string in PostgreSQL, but we need native bigint
 * for financial calculations. This transformer handles the conversion.
 * 
 * Usage:
 *   @Column({ type: 'bigint', transformer: BigIntTransformer })
 *   amountInCentavos: bigint
 */
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
