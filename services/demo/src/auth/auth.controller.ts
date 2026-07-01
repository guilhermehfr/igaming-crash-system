import { Body, Controller, HttpCode, HttpException, HttpStatus, Post } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { config } from "../config/configuration";
import { CreateWalletUseCase } from "@application/use-cases/create-wallet";
import { GetWalletUseCase } from "@application/use-cases/get-wallet";
import { CreateWalletDto } from "@application/dtos/create-wallet";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

@Controller("auth/realms/crash-game/protocol/openid-connect")
export class AuthController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  @Post("token")
  @HttpCode(200)
  async login(
    @Body() body: { username?: string; password?: string; grant_type?: string },
  ) {
    if (body.grant_type !== "password") {
      throw new HttpException("Unsupported grant_type", HttpStatus.BAD_REQUEST);
    }

    if (!body.username || !body.password) {
      throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
    }

    if (body.username !== "player" || body.password !== "player123") {
      throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
    }

    try {
      await this.getWalletUseCase.execute(DEMO_USER_ID);
    } catch {
      const dto = new CreateWalletDto(DEMO_USER_ID, 1000);
      await this.createWalletUseCase.execute(dto);
    }

    const token = jwt.sign(
      {
        sub: DEMO_USER_ID,
        preferred_username: "demo",
        iss: "demo-auth",
      },
      config.jwt.secret,
      { expiresIn: "24h", algorithm: "HS256" },
    );

    return {
      access_token: token,
      token_type: "bearer",
      expires_in: 86400,
      scope: "openid",
    };
  }
}
