export type ActionType =
  | 'place_bet'
  | 'cash_out'
  | 'crashed'
  | 'cashed_out'
  | 'loading'
  | 'loading_round'
  | 'running_no_bet'
  | 'none';

export function getActionType(
  myBetState: 'none' | 'pending' | 'cashed_out' | 'lost',
  roundState: 'betting' | 'running' | 'crashed',
  _connected: boolean,
  actionLoading: boolean,
  isLoadingRound: boolean,
): ActionType {
  if (actionLoading) return 'loading';
  if (isLoadingRound) return 'loading_round';
  if (myBetState === 'cashed_out') return 'cashed_out';
  if (myBetState === 'lost' || roundState === 'crashed') return 'crashed';
  if (roundState === 'running' && myBetState === 'pending') return 'cash_out';
  if (roundState === 'running' && myBetState === 'none') return 'running_no_bet';
  if (roundState === 'betting') return 'place_bet';
  return 'none';
}

export function getActionLabel(type: ActionType): string {
  switch (type) {
    case 'loading':
      return '...';
    case 'loading_round':
      return 'LOADING';
    case 'cashed_out':
      return 'CASHED OUT';
    case 'crashed':
      return 'CRASHED';
    case 'cash_out':
      return 'CASH OUT';
    case 'running_no_bet':
      return 'RUNNING';
    case 'place_bet':
      return 'PLACE BET';
    default:
      return '';
  }
}
