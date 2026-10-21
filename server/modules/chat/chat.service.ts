import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  CapabilityService,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { asc, eq, and, gte, desc, count } from 'drizzle-orm';
import {
  chatMessages,
  kidProfile,
  tasks,
  eggTasks,
  readingRecords,
  exerciseRecords,
  moodRecords,
  wrongQuestions,
} from '@server/database/schema';
import type { ChatMessage } from '@shared/api.interface';

interface DataContextProfile {
  nickname: string;
  availableStars: number;
  totalStars: number;
  weekStars: number;
  weekTarget: number;
  weekAchieved: number;
  readingPoints: number;
  readingStreak: number;
  exerciseStreak: number;
  parentRole: string;
}

interface DataContextTask {
  name: string;
  currentCount: number;
  targetCount: number;
  isAchieved: boolean;
  starReward: number;
}

interface DataContextEggTask {
  name: string;
  isCompleted: boolean;
  starReward: number;
}

interface DataContextTodayReading {
  todayReadingMinutes: number;
  todayReadingPoints: number;
}

interface DataContextWeekExercise {
  weekExerciseCount: number;
  weekExerciseMinutes: number;
  bestExerciseRecord: string;
}

interface DataContextTodayMood {
  todayMood: string;
}

interface DataContextWrongQuestion {
  wrongQuestionTotal: number;
  wrongQuestionMastered: number;
}

interface DataContext {
  profile: Partial<DataContextProfile>;
  weekTasks: DataContextTask[];
  eggTasks: DataContextEggTask[];
  todayReading: DataContextTodayReading;
  weekExercise: DataContextWeekExercise;
  todayMood: DataContextTodayMood;
  wrongQuestions: DataContextWrongQuestion;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject(CapabilityService)
    private readonly capabilityService: CapabilityService,
  ) {}

  private async resolveProfileId(platformUserId: string): Promise<string> {
    const rows = await this.db.select({ id: kidProfile.id })
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('孩子档案不存在');
    return rows[0].id;
  }

  private toChatMessage(
    row: typeof chatMessages.$inferSelect,
  ): ChatMessage {
    return {
      id: row.id,
      sender: row.sender as ChatMessage['sender'],
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private getWeekStart(): string {
    const now: Date = new Date();
    const day: number = now.getDay() || 7;
    const monday: Date = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }

  private getToday(): string {
    const now: Date = new Date();
    return now.toISOString().slice(0, 10);
  }

  async getMessages(platformUserId: string): Promise<ChatMessage[]> {
    const profileId = await this.resolveProfileId(platformUserId);
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.familyAccountId, profileId))
      .orderBy(asc(chatMessages.createdAt));
    return rows.map((row: typeof chatMessages.$inferSelect) =>
      this.toChatMessage(row),
    );
  }

  async saveUserMessage(platformUserId: string, content: string): Promise<ChatMessage> {
    const profileId = await this.resolveProfileId(platformUserId);
    const inserted = await this.db
      .insert(chatMessages)
      .values({ sender: 'parent', content, familyAccountId: profileId })
      .returning();
    return this.toChatMessage(inserted[0]);
  }

  async saveAiMessage(platformUserId: string, content: string): Promise<ChatMessage> {
    const profileId = await this.resolveProfileId(platformUserId);
    const inserted = await this.db
      .insert(chatMessages)
      .values({ sender: 'bub', content, familyAccountId: profileId })
      .returning();
    return this.toChatMessage(inserted[0]);
  }

  async buildDataContext(platformUserId: string): Promise<string> {
    const ctx = await this.buildDataContextRaw(platformUserId);
    return JSON.stringify(ctx);
  }

  private async buildDataContextRaw(platformUserId: string): Promise<DataContext> {
    const weekStart: string = this.getWeekStart();
    const today: string = this.getToday();
    const profileId = await this.resolveProfileId(platformUserId);

    // kid profile - first record for this family
    const profileRows = await this.db
      .select({
        nickname: kidProfile.nickname,
        availableStars: kidProfile.availableStars,
        totalStars: kidProfile.totalStars,
        weekStars: kidProfile.weekStars,
        weekTarget: kidProfile.weekTarget,
        weekAchieved: kidProfile.weekAchieved,
        readingPoints: kidProfile.readingPoints,
        readingStreak: kidProfile.readingStreak,
        exerciseStreak: kidProfile.exerciseStreak,
        parentRole: kidProfile.parentRole,
      })
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);

    const profile: Partial<DataContextProfile> =
      profileRows.length > 0 ? { ...profileRows[0] } : {};

    // week tasks
    const taskRows = await this.db
      .select({
        name: tasks.name,
        currentCount: tasks.currentCount,
        targetCount: tasks.targetCount,
        isAchieved: tasks.isAchieved,
        starReward: tasks.starReward,
      })
      .from(tasks)
      .where(and(
        gte(tasks.weekStart, weekStart),
        eq(tasks.familyAccountId, profileId),
      ))
      .orderBy(asc(tasks.sortOrder));

    const weekTasks: DataContextTask[] = taskRows.map(
      (row: (typeof taskRows)[number]): DataContextTask => ({
        name: row.name,
        currentCount: row.currentCount,
        targetCount: row.targetCount,
        isAchieved: row.isAchieved,
        starReward: row.starReward,
      }),
    );

    // egg tasks
    const eggTaskRows = await this.db
      .select({
        name: eggTasks.name,
        isCompleted: eggTasks.isCompleted,
        starReward: eggTasks.starReward,
      })
      .from(eggTasks)
      .where(eq(eggTasks.familyAccountId, profileId));

    const eggTaskList: DataContextEggTask[] = eggTaskRows.map(
      (row: (typeof eggTaskRows)[number]): DataContextEggTask => ({
        name: row.name,
        isCompleted: row.isCompleted,
        starReward: row.starReward,
      }),
    );

    // today reading
    const todayReadingRows = await this.db
      .select({
        minutes: readingRecords.durationMinutes,
        points: readingRecords.pointsEarned,
      })
      .from(readingRecords)
      .where(and(
        eq(readingRecords.recordDate, today),
        eq(readingRecords.familyAccountId, profileId),
      ));

    const todayReadingMinutes: number = todayReadingRows.reduce(
      (sum: number, r: (typeof todayReadingRows)[number]) =>
        sum + r.minutes,
      0,
    );
    const todayReadingPoints: number = todayReadingRows.reduce(
      (sum: number, r: (typeof todayReadingRows)[number]) =>
        sum + r.points,
      0,
    );

    // week exercise
    const weekExerciseRows = await this.db
      .select({
        exerciseType: exerciseRecords.exerciseType,
        durationMinutes: exerciseRecords.durationMinutes,
      })
      .from(exerciseRecords)
      .where(and(
        gte(exerciseRecords.recordDate, weekStart),
        eq(exerciseRecords.familyAccountId, profileId),
      ));

    const weekExerciseCount: number = weekExerciseRows.length;
    const weekExerciseMinutes: number = weekExerciseRows.reduce(
      (sum: number, r: (typeof weekExerciseRows)[number]) =>
        sum + r.durationMinutes,
      0,
    );

    let bestExerciseRecord: string = '';
    if (weekExerciseRows.length > 0) {
      const best = weekExerciseRows.reduce(
        (
          bestSoFar: (typeof weekExerciseRows)[number],
          r: (typeof weekExerciseRows)[number],
        ): (typeof weekExerciseRows)[number] =>
          r.durationMinutes > bestSoFar.durationMinutes ? r : bestSoFar,
        weekExerciseRows[0],
      );
      bestExerciseRecord = `${best.exerciseType} ${best.durationMinutes}分钟`;
    }

    // today mood - latest one
    const todayMoodRows = await this.db
      .select({
        emotion: moodRecords.emotion,
        content: moodRecords.content,
      })
      .from(moodRecords)
      .where(and(
        eq(moodRecords.recordDate, today),
        eq(moodRecords.familyAccountId, profileId),
      ))
      .orderBy(desc(moodRecords.createdAt))
      .limit(1);

    let todayMood: string = '';
    if (todayMoodRows.length > 0) {
      const m = todayMoodRows[0];
      todayMood = `${m.emotion} ${m.content}`;
    }

    // wrong questions stats
    const totalResult = await this.db
      .select({ count: count() })
      .from(wrongQuestions)
      .where(eq(wrongQuestions.familyAccountId, profileId));
    const wrongQuestionTotal: number = Number(totalResult[0]?.count ?? 0);

    const masteredResult = await this.db
      .select({ count: count() })
      .from(wrongQuestions)
      .where(and(
        eq(wrongQuestions.isMastered, true),
        eq(wrongQuestions.familyAccountId, profileId),
      ));
    const wrongQuestionMastered: number = Number(
      masteredResult[0]?.count ?? 0,
    );

    const dataContext: DataContext = {
      profile,
      weekTasks,
      eggTasks: eggTaskList,
      todayReading: {
        todayReadingMinutes,
        todayReadingPoints,
      },
      weekExercise: {
        weekExerciseCount,
        weekExerciseMinutes,
        bestExerciseRecord,
      },
      todayMood: {
        todayMood,
      },
      wrongQuestions: {
        wrongQuestionTotal,
        wrongQuestionMastered,
      },
    };

    return dataContext;
  }

  async *streamAiReply(platformUserId: string, userMessage: string): AsyncGenerator<string, string, void> {
    const dataContextRaw = await this.buildDataContextRaw(platformUserId);
    const childName: string = dataContextRaw.profile?.nickname || '布布';
    const dataContext: string = JSON.stringify(dataContextRaw);

    const stream = this.capabilityService
      .load('child_learning_ai_chat_1')
      .callStream('textGenerate', {
        chat_role: '布布',
        user_message: userMessage,
        data_context: dataContext,
      });

    const normalized =
      stream && typeof stream === 'object' && 'output' in stream
        ? (stream as { output: AsyncIterable<{ content: string }> }).output
        : (stream as AsyncIterable<{ content: string }>);

    let fullContent: string = '';
    for await (const chunk of normalized) {
      let piece: string = chunk.content ?? '';
      if (piece && childName !== '布布') {
        piece = piece.replace(/布布/g, childName);
      }
      if (piece) {
        fullContent += piece;
        yield piece;
      }
    }

    return fullContent;
  }
}
