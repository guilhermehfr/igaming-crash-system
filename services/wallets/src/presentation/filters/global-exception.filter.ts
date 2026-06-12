import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const body = typeof res === 'object' ? res : { statusCode: status, message: res };
      response.status(status).json(body);
      return;
    }

    const message = exception instanceof Error ? exception.message : 'Internal server error';
    const status = this.mapErrorToStatus(message);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private mapErrorToStatus(message: string): number {
    if (message.toLowerCase().includes('not found')) return HttpStatus.NOT_FOUND;
    if (message.toLowerCase().includes('already exists')) return HttpStatus.CONFLICT;
    return HttpStatus.BAD_REQUEST;
  }
}
