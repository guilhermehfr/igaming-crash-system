import type { BetResponseDto } from "@application/dtos/bet-response.dto";
import { CashOutDto } from "@application/dtos/cash-out.dto";
import { PlaceBetDto } from "@application/dtos/place-bet.dto";
import { RoundResponseDto } from "@application/dtos/round-response.dto";
import { RoundLifecycleService } from "@application/services/round-lifecycle.service";
import { CashOutUseCase } from "@application/use-cases/cash-out.use-case";
import { GetBetUseCase } from "@application/use-cases/get-bet.use-case";
import { GetCurrentRoundUseCase } from "@application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "@application/use-cases/get-round-history.use-case";
import { PlaceBetUseCase } from "@application/use-cases/place-bet.use-case";
import {
	Body,
	Controller,
	Get,
	Headers,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Query,
} from "@nestjs/common";
import type { HealthCheckResponseDto } from "@presentation/dtos/health-check-response.dto";

@Controller("games")
export class GamesController {
	constructor(
		private readonly placeBetUseCase: PlaceBetUseCase,
		private readonly cashOutUseCase: CashOutUseCase,
		private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
		private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
		private readonly getBetUseCase: GetBetUseCase,
		private readonly roundLifecycleService: RoundLifecycleService,
	) {}

	@Get("health")
	check(): HealthCheckResponseDto {
		return { status: "ok", service: "games" };
	}

	@Post("bets")
	async placeBet(
		@Headers("x-user-id") userId: string | undefined,
		@Body() body: { amountInMainUnit: number; userId?: string },
	): Promise<BetResponseDto> {
		try {
			if (body.userId) {
				throw new Error("User ID must not be provided in the request body");
			}
			if (!userId) {
				throw new HttpException(
					"Missing X-User-Id header",
					HttpStatus.BAD_REQUEST,
				);
			}
			const dto = new PlaceBetDto(userId, body.amountInMainUnit);
			return await this.placeBetUseCase.execute(dto);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}

	@Post("bets/:betId/cash-out")
	async cashOut(
		@Param("betId") betId: string,
		@Body() body: { multiplier: number },
	): Promise<BetResponseDto> {
		try {
			const dto = new CashOutDto(betId, body.multiplier);
			return await this.cashOutUseCase.execute(dto);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}

	@Get("bets/:betId")
	async getBet(@Param("betId") betId: string): Promise<BetResponseDto> {
		try {
			const bet = await this.getBetUseCase.execute(betId);
			if (!bet) {
				throw new HttpException("Bet not found", HttpStatus.NOT_FOUND);
			}
			return bet;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}

	@Get("current")
	async getCurrentRound(): Promise<RoundResponseDto> {
		try {
			return await this.getCurrentRoundUseCase.execute();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}

	@Get("history")
	async getRoundHistory(
		@Query("page") page: string = "1",
		@Query("limit") limit: string = "10",
	): Promise<RoundResponseDto[]> {
		try {
			const pageNum = parseInt(page, 10);
			const limitNum = parseInt(limit, 10);
			return await this.getRoundHistoryUseCase.execute({
				page: pageNum,
				limit: limitNum,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}

	@Post("rounds")
	async createRound(): Promise<RoundResponseDto> {
		try {
			const existingRound = this.roundLifecycleService.getCurrentRound();
			if (existingRound && existingRound.state !== "CRASHED") {
				throw new Error("A round is already active");
			}

			await this.roundLifecycleService.initializeNewRound();

			const currentRound = this.roundLifecycleService.getCurrentRound();
			if (!currentRound) {
				throw new Error("Failed to create round");
			}

			return RoundResponseDto.fromDomain(currentRound);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}
}
