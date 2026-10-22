import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { KidShopService } from './kid-shop.service';

@NeedLogin()
@Controller('api/v2')
export class KidShopController {
  constructor(private readonly shop: KidShopService) {}

  /* 商店 */
  @Get('shop')
  async listShop(@Query('childId') childId: string) {
    return this.shop.listShop(childId);
  }

  @Post('shop/:itemId/exchange')
  async exchange(
    @Param('itemId') itemId: string,
    @Body() body: { childId: string; idempotencyKey?: string },
  ) {
    return this.shop.exchange(body.childId, itemId, body.idempotencyKey);
  }

  @Get('exchanges')
  async exchanges(@Query('childId') childId: string) {
    return this.shop.listExchanges(childId);
  }

  /* 心愿 */
  @Get('wishes')
  async wishes(@Query('childId') childId: string) {
    return this.shop.listWishes(childId);
  }

  @Post('wishes')
  async createWish(@Body() body: { childId: string; title: string; fulfillType?: string }) {
    return this.shop.createWish(body.childId, body.title, body.fulfillType);
  }

  @Post('wishes/:wishId/confirm')
  async confirmWish(@Param('wishId') wishId: string, @Body() body: { childId: string }) {
    return this.shop.confirmWish(body.childId, wishId);
  }

  /* 签到彩蛋 */
  @Get('eggs')
  async eggs(@Query('childId') childId: string) {
    return this.shop.listEggs(childId);
  }

  @Post('eggs/:eggId/open')
  async openEgg(@Param('eggId') eggId: string, @Body() body: { childId: string }) {
    return this.shop.openEgg(body.childId, eggId);
  }

  /* 星星流水 */
  @Get('ledger')
  async ledger(@Query('childId') childId: string) {
    return this.shop.listLedger(childId);
  }
}
