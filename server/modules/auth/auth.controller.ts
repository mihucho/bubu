import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { KidProfile, ProfileStatusResponse, InitProfileRequest } from '@shared/api.interface';

@NeedLogin()
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('profile-status')
  async getProfileStatus(@Req() req: Request): Promise<ProfileStatusResponse> {
    return this.authService.checkProfile(req.userContext.userId!);
  }

  @Post('init-profile')
  async initProfile(
    @Req() req: Request,
    @Body() body: InitProfileRequest,
  ): Promise<KidProfile> {
    return this.authService.initProfile(
      req.userContext.userId!,
      body.nickname,
      body.parentRole,
    );
  }
}
