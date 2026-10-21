import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { KidService } from './kid.service';
import type { KidProfile, DashboardStats, ReadingTracker } from '@shared/api.interface';

@NeedLogin()
@Controller('api/kid')
export class KidController {
  constructor(private readonly kidService: KidService) {}

  @Get('profile')
  async getProfile(@Req() req: Request): Promise<KidProfile> {
    return this.kidService.getProfile(req.userContext.userId!);
  }

  @Get('dashboard')
  async getDashboard(@Req() req: Request): Promise<DashboardStats> {
    return this.kidService.getDashboard(req.userContext.userId!);
  }

  @Patch('profile')
  async updateProfile(
    @Req() req: Request,
    @Body() patch: Partial<KidProfile>,
  ): Promise<KidProfile> {
    return this.kidService.updateProfile(req.userContext.userId!, patch);
  }

  @Post('stars/add')
  async addStars(
    @Req() req: Request,
    @Body() body: { amount: number },
  ): Promise<KidProfile> {
    return this.kidService.addStars(req.userContext.userId!, body.amount);
  }

  @Post('stars/spend')
  async spendStars(
    @Req() req: Request,
    @Body() body: { amount: number },
  ): Promise<KidProfile> {
    return this.kidService.spendStars(req.userContext.userId!, body.amount);
  }

  @Get('reading-tracker')
  async getReadingTracker(@Req() req: Request): Promise<ReadingTracker[]> {
    return this.kidService.getReadingTracker(req.userContext.userId!);
  }

  @Patch('reading-tracker/:id/seen')
  async markSeen(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ReadingTracker> {
    return this.kidService.markSeen(req.userContext.userId!, id);
  }
}
