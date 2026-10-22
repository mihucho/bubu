import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { FamilyService } from '../family/family.service';
import { KidBadgeService, KidQuestService, MessageService } from './kid-quest.service';

@NeedLogin()
@Controller('api/v2')
export class KidQuestController {
  constructor(
    private readonly quests: KidQuestService,
    private readonly badges: KidBadgeService,
    private readonly msgs: MessageService,
    private readonly family: FamilyService,
  ) {}

  /* 闯关 */
  @Get('quests')
  async listQuests(@Query('childId') childId: string) {
    return this.quests.listQuests(childId);
  }

  @Post('quests/:questId/attempt')
  async attempt(
    @Param('questId') questId: string,
    @Body() body: { childId: string; result: 'pass' | 'fail' },
  ) {
    return this.quests.attempt(body.childId, questId, body.result);
  }

  @Post('quests')
  async createQuest(
    @Body() body: { childId: string; subject: string; title: string; photos?: unknown[]; errorReason?: string },
  ) {
    return this.quests.createQuest(body.childId, body);
  }

  /* 徽章 */
  @Get('badges')
  async wall(@Query('childId') childId: string) {
    return this.badges.wall(childId);
  }

  @Post('badges/evaluate')
  async evaluate(@Body() body: { childId: string }) {
    return this.badges.evaluate(body.childId);
  }

  /* 小信箱 */
  @Get('inbox')
  async kidInbox(@Query('childId') childId: string) {
    return this.msgs.kidInbox(childId);
  }

  @Post('inbox/:messageId/read')
  async read(@Param('messageId') messageId: string) {
    return this.msgs.markRead(messageId);
  }

  /* 家长：通知中心 + 留言 */
  @Get('parent/inbox')
  async parentInbox(@Req() req: Request) {
    const family = await this.family.ensureFamily(req.userContext.userId!);
    return this.msgs.parentInbox(family.id);
  }

  @Post('parent/notes')
  async note(
    @Req() req: Request,
    @Body() body: { childId: string; body: string },
  ) {
    const family = await this.family.ensureFamily(req.userContext.userId!);
    return this.msgs.sendNote({
      familyAccountId: family.id,
      childId: body.childId,
      fromUser: req.userContext.userId,
      body: body.body,
    });
  }
}
