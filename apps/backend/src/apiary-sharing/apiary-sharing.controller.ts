import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiarySharingService } from './apiary-sharing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../auth/interface/request-with-user.interface';
import { ZodValidation } from '../common';
import {
  createApiaryInviteSchema,
  updateApiaryMemberSchema,
  CreateApiaryInvite,
  UpdateApiaryMember,
} from 'shared-schemas';

@Controller()
export class ApiarySharingController {
  constructor(private readonly sharingService: ApiarySharingService) {}

  // --- Invite management (owner only) ---

  @Post('apiaries/:id/invites')
  @UseGuards(JwtAuthGuard)
  @ZodValidation(createApiaryInviteSchema)
  createInvite(
    @Param('id') apiaryId: string,
    @Body() dto: CreateApiaryInvite,
    @Req() req: RequestWithUser,
  ) {
    return this.sharingService.createInvite(apiaryId, req.user.id, dto);
  }

  @Get('apiaries/:id/invites')
  @UseGuards(JwtAuthGuard)
  listInvites(@Param('id') apiaryId: string, @Req() req: RequestWithUser) {
    return this.sharingService.listInvites(apiaryId, req.user.id);
  }

  @Delete('apiaries/:id/invites/:inviteId')
  @UseGuards(JwtAuthGuard)
  revokeInvite(
    @Param('id') apiaryId: string,
    @Param('inviteId') inviteId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.sharingService.revokeInvite(apiaryId, inviteId, req.user.id);
  }

  // --- Join flow ---

  @Get('join/:token')
  getInviteInfo(
    @Param('token') token: string,
    @Req() req: { user?: { id: string } },
  ) {
    return this.sharingService.getInviteInfo(token, req.user?.id);
  }

  @Post('join/:token')
  @UseGuards(JwtAuthGuard)
  joinApiary(@Param('token') token: string, @Req() req: RequestWithUser) {
    return this.sharingService.joinApiary(token, req.user.id);
  }

  // --- Member management (owner only) ---

  @Get('apiaries/:id/members')
  @UseGuards(JwtAuthGuard)
  listMembers(@Param('id') apiaryId: string, @Req() req: RequestWithUser) {
    return this.sharingService.listMembers(apiaryId, req.user.id);
  }

  @Patch('apiaries/:id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @ZodValidation(updateApiaryMemberSchema)
  updateMember(
    @Param('id') apiaryId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateApiaryMember,
    @Req() req: RequestWithUser,
  ) {
    return this.sharingService.updateMember(
      apiaryId,
      memberId,
      req.user.id,
      dto,
    );
  }

  @Delete('apiaries/:id/members/me')
  @UseGuards(JwtAuthGuard)
  leaveApiary(@Param('id') apiaryId: string, @Req() req: RequestWithUser) {
    return this.sharingService.leaveApiary(apiaryId, req.user.id);
  }

  @Delete('apiaries/:id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  removeMember(
    @Param('id') apiaryId: string,
    @Param('memberId') memberId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.sharingService.removeMember(apiaryId, memberId, req.user.id);
  }
}
