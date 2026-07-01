import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import jwt from "jsonwebtoken";
import { config } from "../config/configuration";

@Injectable()
export class DemoXUserIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    const headers = req.headers as Record<string, string | undefined>;

    const authHeader = headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, config.jwt.secret, {
          algorithms: ["HS256"],
        }) as { sub: string };
        req.userId = payload.sub;
        return true;
      } catch {}
    }

    const userId = headers["x-user-id"];
    if (!userId) {
      throw new HttpException("Missing X-User-Id header", HttpStatus.BAD_REQUEST);
    }

    req.userId = userId;
    return true;
  }
}
