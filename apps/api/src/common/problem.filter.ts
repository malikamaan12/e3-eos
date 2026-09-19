import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ProblemDocumentFactory } from '@e3-eos/contracts';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request.headers['request-id'] as string) ||
      `req-${Date.now()}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let title = 'An internal server error occurred';
    let detail: string | undefined = undefined;
    let invalidParams: any[] | undefined = undefined;
    let conditions: any[] | undefined = undefined;
    let permittedNextActions: string[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        detail = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        code = obj.code || (status === 403 ? 'FORBIDDEN_SCOPE' : status === 404 ? 'NOT_FOUND' : 'ERROR');
        title = obj.title || exception.message || 'HTTP Error';
        detail = obj.detail || obj.message;
        invalidParams = obj.invalidParams;
        conditions = obj.conditions;
        permittedNextActions = obj.permittedNextActions;
      }
    } else if (exception instanceof Error) {
      if (exception.name === 'DatastoreUnavailableError' || (exception as any).constructor?.name === 'DatastoreUnavailableError') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        code = 'DATASTORE_UNAVAILABLE';
        title = 'Durable Datastore Unavailable';
        detail = exception.message;
      } else {
        detail = exception.message;
      }
    }

    const problemDoc = ProblemDocumentFactory.create({
      title,
      status,
      code,
      detail,
      requestId,
      invalidParams,
      conditions,
      permittedNextActions,
    });

    response.setHeader('Content-Type', 'application/problem+json');
    response.status(status).json(problemDoc);
  }
}
