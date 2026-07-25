export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`;
}
