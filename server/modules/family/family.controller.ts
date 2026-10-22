import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { FamilyService, type FamilyBootstrap, type FamilyChildSummary } from './family.service';

@NeedLogin()
@Controller('api/v2/family')
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  /** 登录后的第一件事：拿到家庭与孩子列表（没有就补一条，保证首屏不空） */
  @Get('bootstrap')
  async bootstrap(@Req() req: Request): Promise<FamilyBootstrap> {
    return this.family.bootstrap(req.userContext.userId!);
  }

  @Get('children')
  async children(@Req() req: Request): Promise<FamilyChildSummary[]> {
    const family = await this.family.ensureFamily(req.userContext.userId!);
    return this.family.listChildren(family.id);
  }

  @Post('setup-step')
  async setupStep(@Req() req: Request, @Body() body: { step: string }) {
    const family = await this.family.ensureFamily(req.userContext.userId!);
    return this.family.setSetupStep(family.id, body.step);
  }

  @Post('children')
  async createChild(
    @Req() req: Request,
    @Body() body: { nickname: string; avatarKey?: string; colorKey?: string },
  ): Promise<FamilyChildSummary> {
    const family = await this.family.ensureFamily(req.userContext.userId!);
    return this.family.createChild(family.id, body);
  }
}
