import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ApiaryRole } from '@/prisma/client';

/**
 * Guard that enforces write permissions on apiary resources.
 * Must be used after ApiaryContextGuard which sets `request.apiaryRole`.
 *
 * VIEWER users are only allowed GET requests.
 * EDITOR and OWNER users are allowed all HTTP methods.
 */
@Injectable()
export class ApiaryPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: {
      method: string;
      apiaryRole?: ApiaryRole;
    } = context.switchToHttp().getRequest();

    const method = request.method.toUpperCase();

    // GET requests are allowed for all roles
    if (method === 'GET') {
      return true;
    }

    // Mutation requests require a defined role of EDITOR or OWNER
    if (!request.apiaryRole) {
      throw new ForbiddenException('Missing apiary role for this operation');
    }

    if (request.apiaryRole === 'VIEWER') {
      throw new ForbiddenException('You have view-only access to this apiary');
    }

    return true;
  }
}
