import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import jwt from "jsonwebtoken";
import { config } from "../config/configuration";

@Injectable()
export class DemoJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    const headers = req.headers as Record<string, string | undefined>;

    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid Authorization header");
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, config.jwt.secret, {
        algorithms: ["HS256"],
      }) as { sub: string; preferred_username?: string };

      req.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
