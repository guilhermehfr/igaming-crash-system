import { Logger } from "@nestjs/common";
import {
	type OnGatewayConnection,
	type OnGatewayDisconnect,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

@WebSocketGateway({
	cors: {
		origin: "*",
	},
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	private readonly logger = new Logger(GamesGateway.name);

	handleConnection(client: Socket) {
		this.logger.log(`Client connected: ${client.id}`);
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
	}

	emitMultiplierUpdate(roundId: string, multiplier: number, state: string) {
		this.server.emit("round:multiplier-updated", {
			roundId,
			multiplier,
			state,
		});
	}

	emitRoundStateChange(
		roundId: string,
		state: string,
		crashPoint: number | null,
	) {
		this.server.emit("round:state-changed", {
			roundId,
			state,
			crashPoint,
		});
	}

	emitBetPlaced(
		roundId: string,
		bet: {
			id: string;
			userId: string;
			demoSessionId: string | null;
			amountInMainUnit: number;
			state: string;
		},
	) {
		this.server.emit("round:bet-placed", {
			roundId,
			bet,
		});
	}

	emitBetCashedOut(
		roundId: string,
		bet: {
			id: string;
			userId: string;
			demoSessionId: string | null;
			multiplier: number | null;
			winningsInMainUnit: number;
		},
	) {
		this.server.emit("round:bet-cashed-out", {
			roundId,
			bet,
		});
	}

	emitRoundCrashed(
		roundId: string,
		crashPoint: number,
		stats: {
			totalBets: number;
			pendingBets: number;
			cashedOutBets: number;
			lostBets: number;
		},
	) {
		this.server.emit("round:crashed", {
			roundId,
			crashPoint,
			stats,
		});
	}
}
