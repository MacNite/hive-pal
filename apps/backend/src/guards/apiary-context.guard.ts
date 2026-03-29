import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiaryRole } from '@/prisma/client';

@Injectable()
export class ApiaryContextGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: {
      headers: Record<string, string>;
      query: Record<string, string>;
      apiaryId: string;
      apiaryRole: ApiaryRole;
      user?: { id: string };
    } = context.switchToHttp().getRequest();

    const apiaryId = request.headers['x-apiary-id'] || request.query.apiaryId;

    if (!apiaryId) {
      throw new BadRequestException(
        'Apiary ID is required (x-apiary-id header or apiaryId query parameter)',
      );
    }

    // If user is not authenticated, we can't proceed
    if (!request.user?.id) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Find the apiary and check if user is owner or active member
    const apiary = await this.prisma.apiary.findFirst({
      where: {
        id: apiaryId,
        OR: [
          { userId: request.user.id },
          {
            members: {
              some: { userId: request.user.id, status: 'ACTIVE' },
            },
          },
        ],
      },
      include: {
        members: {
          where: { userId: request.user.id, status: 'ACTIVE' },
          select: { role: true },
        },
      },
    });

    if (!apiary) {
      throw new NotFoundException(
        'Apiary not found or does not belong to the user',
      );
    }

    // Determine the user's role for this apiary
    const role: ApiaryRole | undefined =
      apiary.userId === request.user.id ? 'OWNER' : apiary.members[0]?.role;

    if (!role) {
      throw new ForbiddenException('User has no valid role for this apiary');
    }

    // Add apiary context to request
    request.apiaryId = apiary.id;
    request.apiaryRole = role;

    return true;
  }
}
