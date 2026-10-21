import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { WrongQuestionService } from './wrong-question.service';
import type { WrongQuestion, WrongQuestionStats } from '@shared/api.interface';

@NeedLogin()
@Controller('api/wrong-questions')
export class WrongQuestionController {
  constructor(private readonly wrongQuestionService: WrongQuestionService) {}

  @Get()
  async getAll(@Req() req: Request): Promise<WrongQuestionStats> {
    return this.wrongQuestionService.getAll(req.userContext.userId!);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: { subject: string; title: string; errorReason?: string },
  ): Promise<WrongQuestion> {
    return this.wrongQuestionService.create(
      req.userContext.userId!,
      body.subject,
      body.title,
      body.errorReason,
    );
  }

  @Patch(':id/mastered')
  async toggleMastered(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<WrongQuestion> {
    return this.wrongQuestionService.toggleMastered(req.userContext.userId!, id);
  }

  @Delete(':id')
  async delete(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.wrongQuestionService.delete(req.userContext.userId!, id);
    return { success: true };
  }
}
