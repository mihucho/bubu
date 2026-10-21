import {
  Controller,
  Get,
  Post,
  Param,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { ShopService } from './shop.service';
import type { ShopItem } from '@shared/api.interface';

interface ExchangeResult {
  success: boolean;
  item?: ShopItem;
  profile?: import('@shared/api.interface').KidProfile;
  message?: string;
}

@NeedLogin()
@Controller('api/shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  async getItems(@Req() req: Request): Promise<ShopItem[]> {
    return this.shopService.getItems(req.userContext.userId!);
  }

  @Post('exchange/:itemId')
  async exchangeItem(
    @Req() req: Request,
    @Param('itemId') itemId: string,
  ): Promise<ExchangeResult> {
    return this.shopService.exchangeItem(req.userContext.userId!, itemId);
  }
}
