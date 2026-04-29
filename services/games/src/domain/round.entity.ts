import { Bet } from './bet.entity';
import { CrashPoint } from './crash-point.vo';

/**
 * Round Entity States - Máquina de Estados
 * 
 * Transições válidas:
 *   BETTING  → RUNNING  (via startRound)
 *   RUNNING  → CRASHED  (via crash)
 * 
 * Operações permitidas por estado:
 *   BETTING:  placeBet, setCrashPoint, startRound
 *   RUNNING:  cashOut, updateMultiplier, crash (automático ao atingir crash point)
 *   CRASHED:  leitura apenas
 */
export enum RoundState {
  BETTING = 'BETTING',     // Aceitando apostas
  RUNNING = 'RUNNING',     // Jogo em andamento (multiplicador aumentando)
  CRASHED = 'CRASHED',     // Jogo finalizado
}

/**
 * Classe customizada para erros de transição de estado
 */
export class InvalidStateTransitionError extends Error {
  constructor(
    currentState: RoundState,
    attemptedAction: string,
  ) {
    super(
      `Invalid state transition: cannot perform "${attemptedAction}" while in "${currentState}" state`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Round Entity - Aggregate Root
 * Representa uma rodada única do jogo crash
 * 
 * Responsabilidades:
 *   - Gerenciar o ciclo de vida da rodada (BETTING → RUNNING → CRASHED)
 *   - Manter coleção de apostas
 *   - Validar transições de estado
 *   - Garantir consistência das apostas durante transições
 *   - Calcular resultados (wagered, winnings, house profit)
 */
export class Round {
  private _id: string;
  private _state: RoundState;
  private _bets: Map<string, Bet>;
  private _currentMultiplier: number;
  private _crashPoint: CrashPoint | null;
  private _bettingStartedAt: Date;
  private _gameStartedAt: Date | null;
  private _gameEndedAt: Date | null;

  constructor(
    id: string,
    state: RoundState = RoundState.BETTING,
    bets: Map<string, Bet> = new Map(),
    currentMultiplier: number = 1.0,
    crashPoint: CrashPoint | null = null,
    bettingStartedAt: Date = new Date(),
    gameStartedAt: Date | null = null,
    gameEndedAt: Date | null = null,
  ) {
    this._id = id;
    this._state = state;
    this._bets = bets;
    this._currentMultiplier = currentMultiplier;
    this._crashPoint = crashPoint;
    this._bettingStartedAt = bettingStartedAt;
    this._gameStartedAt = gameStartedAt;
    this._gameEndedAt = gameEndedAt;
  }

  /**
   * Factory method: Cria uma nova rodada no estado BETTING
   * @param id - Identificador único da rodada
   * @returns Nova instância de Round
   */
  static create(id: string): Round {
    return new Round(id);
  }

  /**
   * Gets the round ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * Gets the current round state
   */
  get state(): RoundState {
    return this._state;
  }

  /**
   * Gets all bets in this round
   */
  get bets(): Bet[] {
    return Array.from(this._bets.values());
  }

  /**
   * Gets the number of bets
   */
  get betCount(): number {
    return this._bets.size;
  }

  /**
   * Gets the current game multiplier
   */
  get currentMultiplier(): number {
    return this._currentMultiplier;
  }

  /**
   * Gets the crash point
   */
  get crashPoint(): CrashPoint | null {
    return this._crashPoint;
  }

  /**
   * Gets when betting started
   */
  get bettingStartedAt(): Date {
    return this._bettingStartedAt;
  }

  /**
   * Gets when the game started
   */
  get gameStartedAt(): Date | null {
    return this._gameStartedAt;
  }

  /**
   * Gets when the game ended
   */
  get gameEndedAt(): Date | null {
    return this._gameEndedAt;
  }

  /**
   * Gets the duration of betting phase in milliseconds
   */
  get bettingDuration(): number {
    const endTime = this._gameStartedAt || new Date();
    return endTime.getTime() - this._bettingStartedAt.getTime();
  }

  // ============================================================================
  // STATE QUERY METHODS
  // ============================================================================

  /**
   * Checks if the round is in betting phase
   */
  isBetting(): boolean {
    return this._state === RoundState.BETTING;
  }

  /**
   * Checks if the round is running
   */
  isRunning(): boolean {
    return this._state === RoundState.RUNNING;
  }

  /**
   * Checks if the round has crashed
   */
  hasCrashed(): boolean {
    return this._state === RoundState.CRASHED;
  }

  // ============================================================================
  // STATE TRANSITION VALIDATION METHODS (Private)
  // ============================================================================

  /**
   * Valida se a transição de BETTING → RUNNING é permitida
   * @throws InvalidStateTransitionError se não estiver em BETTING
   */
  private validateBettingToRunning(): void {
    if (!this.isBetting()) {
      throw new InvalidStateTransitionError(this._state, 'startRound');
    }
  }

  /**
   * Valida se a transição de RUNNING → CRASHED é permitida
   * @throws InvalidStateTransitionError se não estiver em RUNNING
   */
  private validateRunningToCrashed(): void {
    if (!this.isRunning()) {
      throw new InvalidStateTransitionError(this._state, 'crash');
    }
  }

  /**
   * Valida se operações de BETTING estão permitidas
   * @throws InvalidStateTransitionError se não estiver em BETTING
   */
  private validateBettingOperationsAllowed(): void {
    if (!this.isBetting()) {
      throw new InvalidStateTransitionError(this._state, 'placeBet');
    }
  }

  /**
   * Valida se operações de RUNNING estão permitidas
   * @throws InvalidStateTransitionError se não estiver em RUNNING
   */
  private validateRunningOperationsAllowed(): void {
    if (!this.isRunning()) {
      throw new InvalidStateTransitionError(this._state, 'updateMultiplier');
    }
  }

  // ============================================================================
  // BET MANAGEMENT - BETTING PHASE
  // ============================================================================

  /**
   * Transition Action: Coloca uma aposta na rodada
   * 
   * Transição implícita: (opcional) permanece em BETTING
   * Validações:
   *   - Round deve estar em BETTING
   *   - Aposta não pode ser duplicada
   * 
   * @param bet - A aposta a ser colocada
   * @throws InvalidStateTransitionError se não estiver em BETTING
   * @throws Error se a aposta já existe
   */
  placeBet(bet: Bet): void {
    this.validateBettingOperationsAllowed();

    if (this._bets.has(bet.id)) {
      throw new Error(`Bet ${bet.id} already exists in this round`);
    }

    this._bets.set(bet.id, bet);
  }

  /**
   * Gets a bet by ID (leitura segura)
   * @param betId - The bet ID
   * @returns The bet if found, null otherwise
   */
  getBet(betId: string): Bet | null {
    return this._bets.get(betId) || null;
  }

  /**
   * Gets all bets for a specific player (leitura segura)
   * @param playerId - The player ID
   * @returns Array of bets placed by the player
   */
  getPlayerBets(playerId: string): Bet[] {
    return this.bets.filter((bet) => bet.playerId === playerId);
  }

  /**
   * Configura o crash point para a rodada
   * 
   * Validações:
   *   - Round deve estar em BETTING
   *   - Crash point não pode ser redefinido
   *   - Todas as apostas pendentes recebem o crash point
   * 
   * @param crashPoint - O ponto de crash gerado (Provably Fair)
   * @throws InvalidStateTransitionError se não estiver em BETTING
   * @throws Error se crash point já foi definido
   */
  setCrashPoint(crashPoint: CrashPoint): void {
    this.validateBettingOperationsAllowed();

    if (this._crashPoint !== null) {
      throw new Error('Crash point is already set for this round');
    }

    this._crashPoint = crashPoint;

    // Atualiza todas as apostas pendentes com o crash point
    this.bets.forEach((bet) => {
      if (bet.isPending()) {
        bet.setCrashPoint(crashPoint);
      }
    });
  }

  // ============================================================================
  // STATE TRANSITIONS
  // ============================================================================

  /**
   * Transition: BETTING → RUNNING
   * 
   * Inicia o jogo, passando da fase de apostas para a fase de execução
   * 
   * Pré-condições:
   *   - Round deve estar em BETTING
   *   - Crash point deve estar definido
   *   - Multiplicador começa em 1.0
   * 
   * Pós-condições:
   *   - Estado muda para RUNNING
   *   - gameStartedAt é registrado
   *   - currentMultiplier fica pronto para ser incrementado
   * 
   * @throws InvalidStateTransitionError se não estiver em BETTING
   * @throws Error se crash point não foi definido
   */
  startRound(): void {
    this.validateBettingToRunning();

    if (this._crashPoint === null) {
      throw new Error('Crash point must be set before starting the round');
    }

    this._state = RoundState.RUNNING;
    this._gameStartedAt = new Date();
    this._currentMultiplier = 1.0;
  }

  /**
   * Transition: RUNNING → CRASHED (automático ou manual)
   * 
   * Encerra o jogo por crash, liquidando todas as apostas pendentes como perdidas
   * 
   * Pré-condições:
   *   - Round deve estar em RUNNING
   * 
   * Pós-condições:
   *   - Estado muda para CRASHED
   *   - gameEndedAt é registrado
   *   - Todas as apostas pendentes são marcadas como LOST
   *   - Apostas CASHED_OUT não são afetadas
   * 
   * @throws InvalidStateTransitionError se não estiver em RUNNING
   */
  crash(): void {
    this.validateRunningToCrashed();

    this._state = RoundState.CRASHED;
    this._gameEndedAt = new Date();

    // Liquida todas as apostas pendentes como perdas
    this.bets.forEach((bet) => {
      if (bet.isPending()) {
        bet.lose();
      }
    });
  }

  // ============================================================================
  // GAME EXECUTION - RUNNING PHASE
  // ============================================================================

  /**
   * Atualiza o multiplicador atual durante a execução do jogo
   * 
   * Comportamento:
   *   - Incrementa o multiplicador a cada tick/frame do jogo
   *   - Se multiplicador >= crash point, dispara crash() automaticamente
   *   - Permite que jogadores façam cash out neste ponto
   * 
   * Validações:
   *   - Round deve estar em RUNNING
   *   - Novo multiplicador deve ser >= 1.0
   *   - Novo multiplicador deve ser >= multiplicador anterior (não pode diminuir)
   * 
   * @param newMultiplier - O novo valor do multiplicador
   * @throws InvalidStateTransitionError se não estiver em RUNNING
   * @throws Error se multiplicador é inválido
   */
  updateMultiplier(newMultiplier: number): void {
    this.validateRunningOperationsAllowed();

    if (newMultiplier < 1.0) {
      throw new Error('Multiplier must be at least 1.0');
    }

    if (newMultiplier < this._currentMultiplier) {
      throw new Error('Multiplier cannot decrease');
    }

    this._currentMultiplier = newMultiplier;

    // Verifica se atingiu o crash point e faz crash automático
    if (this._crashPoint && this._crashPoint.hasCrashed(newMultiplier)) {
      this.crash();
    }
  }

  /**
   * Permite que um jogador faça cash out de uma aposta durante o jogo
   * 
   * Comportamento:
   *   - Localiza a aposta do jogador
   *   - Registra o multiplicador no momento do cash out
   *   - Calcula os ganhos
   *   - Muda estado da aposta para CASHED_OUT
   * 
   * Validações:
   *   - Round deve estar em RUNNING
   *   - Aposta deve estar PENDING
   *   - Multiplicador deve estar abaixo do crash point
   * 
   * @param betId - ID da aposta para cash out
   * @param multiplier - Multiplicador atual (para validação)
   * @throws InvalidStateTransitionError se não estiver em RUNNING
   * @throws Error se aposta não existe ou não está em estado válido
   */
  cashOut(betId: string, multiplier: number): void {
    this.validateRunningOperationsAllowed();

    const bet = this.getBet(betId);
    if (!bet) {
      throw new Error(`Bet ${betId} not found in this round`);
    }

    if (!bet.isPending()) {
      throw new Error(`Bet ${betId} is not in PENDING state`);
    }

    // Validação: não pode fazer cash out após crash point
    if (this._crashPoint && this._crashPoint.hasCrashed(multiplier)) {
      throw new Error('Cannot cash out after crash point');
    }

    // Delega a ação de cash out para a aposta
    bet.cashOut(multiplier);
  }

  // ============================================================================
  // CALCULATIONS (READONLY - sem efeito no estado)
  // ============================================================================

  /**
   * Calcula o valor total apostado nesta rodada
   * @returns Soma de todas as apostas em centavos
   */
  calculateTotalWagered(): bigint {
    return this.bets.reduce(
      (total, bet) => total + bet.betAmountInCentavos,
      0n,
    );
  }

  /**
   * Calcula o total de ganhos (apenas apostas que foram resgatadas)
   * @returns Soma de ganhos das apostas com cash out em centavos
   */
  calculateTotalWinnings(): bigint {
    return this.bets.reduce((total, bet) => {
      if (bet.isCashedOut() && bet.winningsInCentavos) {
        return total + bet.winningsInCentavos;
      }
      return total;
    }, 0n);
  }

  /**
   * Calcula o resultado final da casa (lucro ou prejuízo)
   * 
   * Fórmula:
   *   - Positivo: casa ganhou (apostas perdidas > ganhos pagos)
   *   - Negativo: casa perdeu (ganhos pagos > apostas perdidas)
   * 
   * @returns Resultado em centavos
   */
  calculateHouseResult(): bigint {
    const totalWagered = this.calculateTotalWagered();
    const totalWinnings = this.calculateTotalWinnings();
    return totalWagered - totalWinnings;
  }

  /**
   * Conta quantas apostas estão em cada estado
   * @returns Objeto com contagem por estado
   */
  getStatistics(): {
    totalBets: number;
    pendingBets: number;
    cashedOutBets: number;
    lostBets: number;
  } {
    let pendingBets = 0;
    let cashedOutBets = 0;
    let lostBets = 0;

    this.bets.forEach((bet) => {
      if (bet.isPending()) pendingBets++;
      else if (bet.isCashedOut()) cashedOutBets++;
      else if (bet.isLost()) lostBets++;
    });

    return {
      totalBets: this.betCount,
      pendingBets,
      cashedOutBets,
      lostBets,
    };
  }
