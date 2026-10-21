import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { ExerciseService } from './exercise.service';
import type { ExerciseStats, ExerciseRecord } from '@shared/api.interface';

@NeedLogin()
@Controller('api/exercise')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Get('stats')
  async getStats(@Req() req: Request): Promise<ExerciseStats> {
    return this.exerciseService.getStats(req.userContext.userId!);
  }

  @Post('record')
  async addRecord(
    @Req() req: Request,
    @Body() body: { exerciseType: string; durationMinutes: number },
  ): Promise<{ record: import('@shared/api.interface').ExerciseRecord; profile: import('@shared/api.interface').KidProfile }> {
    return this.exerciseService.addRecord(req.userContext.userId!, body.exerciseType, body.durationMinutes);
  }

  @Delete('record/:id')
  async deleteRecord(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.exerciseService.deleteRecord(req.userContext.userId!, id);
    return { success: true };
  }
}
