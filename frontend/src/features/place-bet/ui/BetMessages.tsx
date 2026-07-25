type BetMessagesProps = {
  error: string | null;
  showInsufficientBalance: boolean;
};

export function BetMessages({ error, showInsufficientBalance }: BetMessagesProps) {
  if (error) {
    return (
      <div className="px-5 pb-2" role="alert">
        <span className="text-sm text-loss-red">{error}</span>
      </div>
    );
  }

  if (showInsufficientBalance) {
    return (
      <div className="px-5 pb-2" role="alert">
        <span className="text-sm text-loss-red">Insufficient balance</span>
      </div>
    );
  }

  return null;
}
