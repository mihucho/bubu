import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { KidRecordsService } from './kid-records.service';

@NeedLogin()
@Controller('api/v2/records')
export class KidRecordsController {
  constructor(private readonly records: KidRecordsService) {}

  @Post('reading')
  async addReading(@Body() body: { childId: string; minutes: number; bookTitle?: string }) {
    return this.records.addReading(body.childId, body.minutes, body.bookTitle);
  }

  @Get('reading')
  async reading(@Query('childId') childId: string) {
    return this.records.readingSummary(childId);
  }

  @Post('exercise')
  async addExercise(
    @Body() body: { childId: string; exerciseType: string; minutes: number; photo?: unknown },
  ) {
    return this.records.addExercise(body.childId, body.exerciseType, body.minutes, body.photo);
  }

  @Get('exercise')
  async exercise(@Query('childId') childId: string) {
    return this.records.exerciseSummary(childId);
  }

  @Post('mood')
  async addMood(@Body() body: { childId: string; emotionKey: string; content?: string }) {
    return this.records.addMood(body.childId, body.emotionKey, body.content);
  }

  @Get('mood')
  async mood(@Query('childId') childId: string, @Query('days') days?: string) {
    return this.records.moodTimeline(childId, days ? Number(days) : 7);
  }

  @Get('profile/:childId')
  async profile(@Param('childId') childId: string) {
    return this.records.profile(childId);
  }
}
