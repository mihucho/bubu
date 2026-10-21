import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Header,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { MoodService } from './mood.service';
import type { MoodRecord } from '@shared/api.interface';

@NeedLogin()
@Controller('api/mood')
export class MoodController {
  constructor(private readonly moodService: MoodService) {}

  @Get()
  async getRecords(@Req() req: Request): Promise<MoodRecord[]> {
    return this.moodService.getRecords(req.userContext.userId!);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: { emotion: string; content: string },
  ): Promise<{ record: MoodRecord; profile: import('@shared/api.interface').KidProfile }> {
    return this.moodService.create(req.userContext.userId!, body.emotion, body.content);
  }

  @Get('export')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="mood-diary.txt"')
  async exportDiary(@Req() req: Request): Promise<string> {
    return this.moodService.exportDiary(req.userContext.userId!);
  }
}
