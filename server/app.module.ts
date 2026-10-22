import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { AuthModule } from './modules/auth/auth.module';
import { KidModule } from './modules/kid/kid.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { EggModule } from './modules/egg/egg.module';
import { MoodModule } from './modules/mood/mood.module';
import { ReadingModule } from './modules/reading/reading.module';
import { ExerciseModule } from './modules/exercise/exercise.module';
import { ChatModule } from './modules/chat/chat.module';
import { ShopModule } from './modules/shop/shop.module';
import { WrongQuestionModule } from './modules/wrong-question/wrong-question.module';
import { KidHomeModule } from './modules/kid-home/kid-home.module';
import { StarsModule } from './modules/stars/stars.module';
import { FamilyModule } from './modules/family/family.module';
import { KidTasksModule } from './modules/kid-tasks/kid-tasks.module';
import { KidRecordsModule } from './modules/kid-records/kid-records.module';
import { ParentModule } from './modules/parent/parent.module';
import { KidShopModule } from './modules/kid-shop/kid-shop.module';
import { AiChatModule } from './modules/ai/ai-chat.module';
import { KidQuestModule } from './modules/kid-quest/kid-quest.module';

@Module({
  imports: [
    PlatformModule.forRoot(),
    AuthModule,
    KidModule,
    TasksModule,
    EggModule,
    MoodModule,
    ReadingModule,
    ExerciseModule,
    ChatModule,
    ShopModule,
    WrongQuestionModule,
    StarsModule,
    FamilyModule,
    KidHomeModule,
    KidTasksModule,
    KidRecordsModule,
    ParentModule,
    KidShopModule,
    AiChatModule,
    KidQuestModule,
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
