import { Body, Controller, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { FamilyService } from '../family/family.service';
import {
  ParentBadgeService,
  ParentFamilyService,
  ParentShopService,
} from './settings.service';

@NeedLogin()
@Controller('api/v2/parent')
export class ParentSettingsController {
  constructor(
    private readonly shop: ParentShopService,
    private readonly badges: ParentBadgeService,
    private readonly familySettings: ParentFamilyService,
    private readonly family: FamilyService,
  ) {}

  private async familyId(req: Request): Promise<string> {
    const f = await this.family.ensureFamily(req.userContext.userId!);
    return f.id;
  }

  /* ---------- 商店 ---------- */
  @Get('shop')
  async listShop(@Req() req: Request) {
    return this.shop.list(await this.familyId(req));
  }

  @Post('shop')
  async createShop(
    @Req() req: Request,
    @Body() body: { childId: string; name: string; starCost: number; iconKey?: string; description?: string },
  ) {
    return this.shop.create(await this.familyId(req), body);
  }

  @Put('shop/:itemId')
  async updateShop(
    @Param('itemId') itemId: string,
    @Body() body: { childId: string; name?: string; starCost?: number; isActive?: boolean },
  ) {
    return this.shop.update(body.childId, itemId, body);
  }

  /* ---------- 徽章 ---------- */
  @Get('badges')
  async listBadges(@Req() req: Request, @Query('childId') childId: string) {
    return this.badges.list(await this.familyId(req), childId);
  }

  @Post('badges')
  async createBadge(
    @Req() req: Request,
    @Body()
    body: {
      childId: string;
      name: string;
      iconKey: string;
      ruleType: string;
      ruleConfig?: Record<string, unknown>;
      starReward?: number;
      praiseText?: string;
    },
  ) {
    return this.badges.create(await this.familyId(req), body.childId, body);
  }

  @Post('badges/:badgeId/award')
  async award(
    @Req() req: Request,
    @Param('badgeId') badgeId: string,
    @Body() body: { childId: string },
  ) {
    return this.badges.award(await this.familyId(req), body.childId, badgeId, req.userContext.userId);
  }

  /* ---------- 家庭与边界 ---------- */
  @Get('family')
  async settings(@Req() req: Request) {
    return this.familySettings.settings(await this.familyId(req));
  }

  @Put('family')
  async updateSettings(@Req() req: Request, @Body() body: Record<string, unknown>) {
    return this.familySettings.updateSettings(await this.familyId(req), body);
  }

  @Get('family/members')
  async members(@Req() req: Request) {
    return this.familySettings.members(await this.familyId(req));
  }

  @Post('family/invites')
  async invite(@Req() req: Request) {
    return this.familySettings.invite(await this.familyId(req), req.userContext.userId!);
  }

  @Get('family/invites')
  async invites(@Req() req: Request) {
    return this.familySettings.listInvites(await this.familyId(req));
  }

  @Post('family/pin')
  async setPin(@Req() req: Request, @Body() body: { pin: string }) {
    return this.familySettings.setPin(await this.familyId(req), body.pin);
  }

  @Post('family/pin/verify')
  async verifyPin(@Req() req: Request, @Body() body: { pin: string }) {
    return this.familySettings.verifyPin(await this.familyId(req), body.pin);
  }

  @Get('audit')
  async audit(@Req() req: Request) {
    return this.familySettings.audit(await this.familyId(req));
  }

  /* ---------- 孩子档案 ---------- */
  @Get('child-profiles')
  async children(@Req() req: Request) {
    return this.familySettings.children(await this.familyId(req));
  }

  @Put('child-profiles/:childId')
  async updateChild(
    @Param('childId') childId: string,
    @Body() body: { nickname?: string; title?: string; avatarKey?: string; colorKey?: string },
  ) {
    return this.familySettings.updateChild(childId, body);
  }

  @Post('child-profiles/:childId/archive')
  async archiveChild(@Req() req: Request, @Param('childId') childId: string) {
    await this.familySettings.log({
      familyAccountId: await this.familyId(req),
      actor: req.userContext.userId,
      childId,
      action: 'child.archive',
      targetTable: 'child_profiles',
      targetId: childId,
    });
    return this.familySettings.archiveChild(childId);
  }
}
