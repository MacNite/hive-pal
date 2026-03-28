import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
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
      apiaryId: string | undefined;
      apiaryRole: ApiaryRole | undefined;
      user?: { id: string };
    } = context.switchToHttp().getRequest();

    const apiaryId = request.headers['x-apiary-id'] || request.query.apiaryId;

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

    // Add apiary context to request
    request.apiaryId = apiaryId ? apiary.id : undefined;
    request.apiaryRole =
      apiary.userId === request.user.id ? 'OWNER' : apiary.members[0]?.role;

    return true;
  }
}
