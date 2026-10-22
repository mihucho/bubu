import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { FamilyService } from '../family/family.service';
import { ParentAccountService, ParentExportService, ParentSearchService } from './extra.service';

@NeedLogin()
@Controller('api/v2/parent')
export class ParentExtraController {
  constructor(
    private readonly searchSvc: ParentSearchService,
    private readonly exportSvc: ParentExportService,
    private readonly account: ParentAccountService,
    private readonly family: FamilyService,
  ) {}

  private async familyId(req: Request): Promise<string> {
    const f = await this.family.ensureFamily(req.userContext.userId!);
    return f.id;
  }

  @Get('search')
  async search(@Req() req: Request, @Query('q') q: string) {
    return this.searchSvc.search(await this.familyId(req), q);
  }

  @Get('export/preview')
  async preview(@Query('childId') childId: string, @Query('days') days?: string) {
    return this.exportSvc.preview(childId, days ? Number(days) : 7);
  }

  @Get('privacy')
  async privacy() {
    return this.account.privacyDoc();
  }

  @Get('privacy/consents')
  async consents(@Req() req: Request) {
    return this.account.consentTrail(await this.familyId(req));
  }

  @Post('privacy/consent')
  async grant(@Req() req: Request, @Body() body: { version: string; kind?: string }) {
    return this.account.grantConsent(await this.familyId(req), body.version, body.kind);
  }

  @Post('account/delete')
  async remove(@Req() req: Request, @Body() body: { confirm: string }) {
    return this.account.requestDeletion(
      await this.familyId(req),
      req.userContext.userId!,
      body.confirm,
    );
  }
}
