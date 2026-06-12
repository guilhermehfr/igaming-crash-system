import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class XUserIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    const headers = req.headers as Record<string, string | undefined>;
    const userId = headers['x-user-id'];

    if (!userId) {
      throw new HttpException('Missing X-User-Id header', HttpStatus.BAD_REQUEST);
    }

    const params = req.params as Record<string, string>;
    const paramUserId = params.userId;
    if (paramUserId && paramUserId !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    req.userId = userId;
    return true;
  }
}
