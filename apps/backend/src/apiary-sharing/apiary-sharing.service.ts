import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLoggerService } from '../logger/logger.service';
import {
  CreateApiaryInvite,
  UpdateApiaryMember,
  ApiaryInviteResponse,
  ApiaryMemberResponse,
  InviteInfoResponse,
  JoinApiaryResponse,
} from 'shared-schemas';

@Injectable()
export class ApiarySharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('ApiarySharingService');
  }

  private async verifyOwnership(
    apiaryId: string,
    userId: string,
  ): Promise<void> {
    const apiary = await this.prisma.apiary.findFirst({
      where: { id: apiaryId, userId },
    });
    if (!apiary) {
      throw new NotFoundException('Apiary not found or you are not the owner');
    }
  }

  async createInvite(
    apiaryId: string,
    userId: string,
    dto: CreateApiaryInvite,
  ): Promise<ApiaryInviteResponse> {
    await this.verifyOwnership(apiaryId, userId);

    const invite = await this.prisma.apiaryInvite.create({
      data: {
        apiaryId,
        role: dto.role,
        createdBy: userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    this.logger.log(
      `Created invite ${invite.id} for apiary ${apiaryId} with role ${dto.role}`,
    );

    return this.mapInviteResponse(invite);
  }

  async listInvites(
    apiaryId: string,
    userId: string,
  ): Promise<ApiaryInviteResponse[]> {
    await this.verifyOwnership(apiaryId, userId);

    const invites = await this.prisma.apiaryInvite.findMany({
      where: { apiaryId, active: true },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => this.mapInviteResponse(invite));
  }

  async revokeInvite(
    apiaryId: string,
    inviteId: string,
    userId: string,
  ): Promise<void> {
    await this.verifyOwnership(apiaryId, userId);

    const invite = await this.prisma.apiaryInvite.findFirst({
      where: { id: inviteId, apiaryId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.prisma.apiaryInvite.update({
      where: { id: inviteId },
      data: { active: false },
    });

    this.logger.log(`Revoked invite ${inviteId} for apiary ${apiaryId}`);
  }

  async getInviteInfo(
    token: string,
    userId?: string,
  ): Promise<InviteInfoResponse> {
    const invite = await this.prisma.apiaryInvite.findUnique({
      where: { token },
      include: { apiary: { select: { name: true, userId: true } } },
    });

    if (!invite || !invite.active) {
      throw new NotFoundException('Invite not found or has been revoked');
    }

    const expired = invite.expiresAt ? new Date() > invite.expiresAt : false;

    let alreadyMember: boolean | undefined;
    if (userId) {
      // Check if user is already the owner
      if (invite.apiary.userId === userId) {
        alreadyMember = true;
      } else {
        // Check if user is already a member
        const existing = await this.prisma.apiaryMember.findUnique({
          where: {
            apiaryId_userId: { apiaryId: invite.apiaryId, userId },
          },
        });
        alreadyMember = !!existing;
      }
    }

    return {
      apiaryName: invite.apiary.name,
      role: invite.role,
      expired,
      alreadyMember,
    };
  }

  async joinApiary(token: string, userId: string): Promise<JoinApiaryResponse> {
    const invite = await this.prisma.apiaryInvite.findUnique({
      where: { token },
      include: { apiary: { select: { name: true, userId: true } } },
    });

    if (!invite || !invite.active) {
      throw new NotFoundException('Invite not found or has been revoked');
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new BadRequestException('This invite has expired');
    }

    // Check if user is the owner
    if (invite.apiary.userId === userId) {
      throw new ConflictException('You are the owner of this apiary');
    }

    // Check if user is already a member
    const existing = await this.prisma.apiaryMember.findUnique({
      where: {
        apiaryId_userId: { apiaryId: invite.apiaryId, userId },
      },
    });

    if (existing) {
      throw new ConflictException(
        'You have already requested to join this apiary',
      );
    }

    const member = await this.prisma.apiaryMember.create({
      data: {
        apiaryId: invite.apiaryId,
        userId,
        role: invite.role,
        status: 'PENDING',
      },
    });

    this.logger.log(
      `User ${userId} requested to join apiary ${invite.apiaryId} via invite ${invite.id}`,
    );

    return {
      apiaryId: invite.apiaryId,
      apiaryName: invite.apiary.name,
      role: member.role,
      status: member.status,
    };
  }

  async listMembers(
    apiaryId: string,
    userId: string,
  ): Promise<ApiaryMemberResponse[]> {
    await this.verifyOwnership(apiaryId, userId);

    const members = await this.prisma.apiaryMember.findMany({
      where: { apiaryId },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user.name,
      userEmail: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
    }));
  }

  async updateMember(
    apiaryId: string,
    memberId: string,
    userId: string,
    dto: UpdateApiaryMember,
  ): Promise<ApiaryMemberResponse> {
    await this.verifyOwnership(apiaryId, userId);

    const member = await this.prisma.apiaryMember.findFirst({
      where: { id: memberId, apiaryId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const updated = await this.prisma.apiaryMember.update({
      where: { id: memberId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.role && { role: dto.role }),
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    this.logger.log(
      `Updated member ${memberId} in apiary ${apiaryId}: ${JSON.stringify(dto)}`,
    );

    return {
      id: updated.id,
      userId: updated.userId,
      userName: updated.user.name,
      userEmail: updated.user.email,
      role: updated.role,
      status: updated.status,
      joinedAt: updated.joinedAt.toISOString(),
    };
  }

  async removeMember(
    apiaryId: string,
    memberId: string,
    userId: string,
  ): Promise<void> {
    await this.verifyOwnership(apiaryId, userId);

    const member = await this.prisma.apiaryMember.findFirst({
      where: { id: memberId, apiaryId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.apiaryMember.delete({
      where: { id: memberId },
    });

    this.logger.log(`Removed member ${memberId} from apiary ${apiaryId}`);
  }

  async leaveApiary(apiaryId: string, userId: string): Promise<void> {
    const member = await this.prisma.apiaryMember.findUnique({
      where: {
        apiaryId_userId: { apiaryId, userId },
      },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this apiary');
    }

    await this.prisma.apiaryMember.delete({
      where: { id: member.id },
    });

    this.logger.log(`User ${userId} left apiary ${apiaryId}`);
  }

  private mapInviteResponse(invite: {
    id: string;
    token: string;
    apiaryId: string;
    role: string;
    expiresAt: Date | null;
    active: boolean;
    createdAt: Date;
  }): ApiaryInviteResponse {
    return {
      id: invite.id,
      token: invite.token,
      apiaryId: invite.apiaryId,
      role: invite.role as ApiaryInviteResponse['role'],
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      active: invite.active,
      createdAt: invite.createdAt.toISOString(),
    };
  }
}
