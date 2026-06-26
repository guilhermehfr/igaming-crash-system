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
import { VerifyRoundUseCase } from "@application/use-cases/verify-round.use-case";
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
	Req,
	UseGuards,
} from "@nestjs/common";
import type { HealthCheckResponseDto } from "@presentation/dtos/health-check-response.dto";
import { XUserIdGuard } from "@presentation/guards/x-user-id.guard";
import type {
	ProvablyFairRevealDto,
	ProvablyFairStatusDto,
	SetClientSeedDto,
} from "@presentation/dtos/provably-fair.dto";

@Controller("games")
export class GamesController {
	constructor(
		private readonly placeBetUseCase: PlaceBetUseCase,
		private readonly cashOutUseCase: CashOutUseCase,
		private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
		private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
		private readonly getBetUseCase: GetBetUseCase,
		private readonly roundLifecycleService: RoundLifecycleService,
		private readonly verifyRoundUseCase: VerifyRoundUseCase,
	) {}

	@Get("health")
	check(): HealthCheckResponseDto {
		return { status: "ok", service: "games" };
	}

	@Post("bets")
	@UseGuards(XUserIdGuard)
	async placeBet(
		@Req() req: Record<string, unknown>,
		@Body() body: { amountInMainUnit: number; userId?: string },
		@Headers("x-demo-session") demoSessionId?: string,
	): Promise<BetResponseDto> {
		try {
			if (body.userId) {
				throw new Error("User ID must not be provided in the request body");
			}
			if (body.amountInMainUnit <= 0) {
				throw new HttpException(
					"Bet amount must be greater than zero",
					HttpStatus.BAD_REQUEST,
				);
			}
			const dto = new PlaceBetDto(
				req.userId as string,
				body.amountInMainUnit,
				demoSessionId,
			);
			return await this.placeBetUseCase.execute(dto);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}

	@Post("bets/:betId/cash-out")
	@UseGuards(XUserIdGuard)
	async cashOut(
		@Req() req: Record<string, unknown>,
		@Param("betId") betId: string,
		@Body() body: { multiplier: number },
	): Promise<BetResponseDto> {
		try {
			const dto = new CashOutDto(
				betId,
				body.multiplier,
				req.userId as string,
			);
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

	@Get("rounds/:roundId/verify")
	async verifyRound(
		@Param("roundId") roundId: string,
	): Promise<ReturnType<typeof this.verifyRoundUseCase.execute>> {
		try {
			return await this.verifyRoundUseCase.execute(roundId);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}

	@Get("provably-fair")
	getProvablyFairStatus(): ProvablyFairStatusDto {
		return {
			serverSeedHash: this.roundLifecycleService.getServerSeedHash(),
			clientSeed: this.roundLifecycleService.getClientSeed(),
			nonce: this.roundLifecycleService.getNonce(),
		};
	}

	@Post("provably-fair/reveal")
	revealServerSeed(): ProvablyFairRevealDto {
		return this.roundLifecycleService.revealServerSeed();
	}

	@Post("provably-fair/client-seed")
	setClientSeed(@Body() body: SetClientSeedDto): ProvablyFairStatusDto {
		try {
			this.roundLifecycleService.setClientSeed(body.clientSeed);
			return {
				serverSeedHash: this.roundLifecycleService.getServerSeedHash(),
				clientSeed: this.roundLifecycleService.getClientSeed(),
				nonce: this.roundLifecycleService.getNonce(),
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}
}
