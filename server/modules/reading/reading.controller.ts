import {
  Controller,
  Get,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { ReadingService } from './reading.service';
import type { ReadingRecord } from '@shared/api.interface';

interface ReadingStats {
  profile: import('@shared/api.interface').KidProfile;
  todayMinutes: number;
  todayTarget: number;
  streak: number;
  records: ReadingRecord[];
}

@NeedLogin()
@Controller('api/reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Get('stats')
  async getStats(@Req() req: Request): Promise<ReadingStats> {
    return this.readingService.getStats(req.userContext.userId!);
  }

  @Post('record')
  async addRecord(
    @Req() req: Request,
    @Body() body: { durationMinutes: number; bookTitle?: string },
  ): Promise<{ record: ReadingRecord; profile: import('@shared/api.interface').KidProfile }> {
    return this.readingService.addRecord(req.userContext.userId!, body.durationMinutes, body.bookTitle);
  }
}
