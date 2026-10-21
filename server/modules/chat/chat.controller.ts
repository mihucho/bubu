import { Controller, Get, Post, Body, Query, Res, Req, BadRequestException, Logger } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request, Response } from 'express';
import { ChatService } from './chat.service';
import type { ChatMessage } from '@shared/api.interface';

@NeedLogin()
@Controller('api/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMessages(@Req() req: Request): Promise<ChatMessage[]> {
    return this.chatService.getMessages(req.userContext.userId!);
  }

  @Post('messages')
  async sendMessage(
    @Req() req: Request,
    @Body() body: { content: string },
  ): Promise<void> {
    if (!body.content || body.content.trim().length === 0) {
      throw new BadRequestException('消息内容不能为空');
    }
    await this.chatService.saveUserMessage(req.userContext.userId!, body.content);
  }

  @Get('ai-reply-stream')
  async aiReplyStream(
    @Req() req: Request,
    @Query('user_message') userMessage: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const generator: AsyncGenerator<string, string, void> =
        this.chatService.streamAiReply(req.userContext.userId!, userMessage);
      let fullContent: string = '';
      let done: boolean = false;

      while (!done) {
        const result: IteratorResult<string, string> = await generator.next();
        if (result.done) {
          fullContent = result.value as string;
          done = true;
        } else {
          const piece: string = result.value as string;
          res.write(
            `data: ${JSON.stringify({ content: piece })}\n\n`,
          );
        }
      }

      res.write(`data: [DONE]\n\n`);

      // Save AI message after stream completes
      if (fullContent) {
        await this.chatService.saveAiMessage(req.userContext.userId!, fullContent);
      }

      res.end();
    } catch (error: unknown) {
      this.logger.error('AI 流式回复失败', error instanceof Error ? error.stack : String(error));
      res.write(
        `data: ${JSON.stringify({ error: '回复失败' })}\n\n`,
      );
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
}
