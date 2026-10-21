import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count } from 'drizzle-orm';
import { wrongQuestions, kidProfile } from '@server/database/schema';
import type { WrongQuestion, WrongQuestionStats } from '@shared/api.interface';

@Injectable()
export class WrongQuestionService {
  private readonly logger = new Logger(WrongQuestionService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private async resolveProfileId(platformUserId: string): Promise<string> {
    const rows = await this.db.select({ id: kidProfile.id })
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('孩子档案不存在');
    return rows[0].id;
  }

  private toWrongQuestion(row: typeof wrongQuestions.$inferSelect): WrongQuestion {
    return {
      id: row.id,
      subject: row.subject,
      title: row.title,
      errorReason: row.errorReason ?? undefined,
      isMastered: row.isMastered,
      recordDate: row.recordDate,
    };
  }

  async getAll(platformUserId: string): Promise<WrongQuestionStats> {
    const profileId = await this.resolveProfileId(platformUserId);
    const totalResult = await this.db
      .select({ count: count() })
      .from(wrongQuestions)
      .where(eq(wrongQuestions.familyAccountId, profileId));
    const total = Number(totalResult[0]?.count ?? 0);

    const masteredResult = await this.db
      .select({ count: count() })
      .from(wrongQuestions)
      .where(and(
        eq(wrongQuestions.isMastered, true),
        eq(wrongQuestions.familyAccountId, profileId),
      ));
    const mastered = Number(masteredResult[0]?.count ?? 0);

    const rows = await this.db
      .select()
      .from(wrongQuestions)
      .where(eq(wrongQuestions.familyAccountId, profileId))
      .orderBy(desc(wrongQuestions.recordDate), desc(wrongQuestions.createdAt));

    return {
      total,
      mastered,
      items: rows.map((row: typeof wrongQuestions.$inferSelect) =>
        this.toWrongQuestion(row),
      ),
    };
  }

  async create(platformUserId: string, subject: string, title: string, errorReason?: string): Promise<WrongQuestion> {
    const profileId = await this.resolveProfileId(platformUserId);
    const today = new Date().toISOString().slice(0, 10);
    const inserted = await this.db
      .insert(wrongQuestions)
      .values({
        familyAccountId: profileId,
        subject,
        title,
        errorReason: errorReason ?? null,
        recordDate: today,
      })
      .returning();
    return this.toWrongQuestion(inserted[0]);
  }

  async toggleMastered(platformUserId: string, id: string): Promise<WrongQuestion> {
    const profileId = await this.resolveProfileId(platformUserId);
    const rows = await this.db
      .select()
      .from(wrongQuestions)
      .where(and(
        eq(wrongQuestions.id, id),
        eq(wrongQuestions.familyAccountId, profileId),
      ))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('错题不存在');
    }
    const updated = await this.db
      .update(wrongQuestions)
      .set({ isMastered: !rows[0].isMastered })
      .where(and(
        eq(wrongQuestions.id, id),
        eq(wrongQuestions.familyAccountId, profileId),
      ))
      .returning();
    return this.toWrongQuestion(updated[0]);
  }

  async delete(platformUserId: string, id: string): Promise<void> {
    const profileId = await this.resolveProfileId(platformUserId);
    const deleted = await this.db
      .delete(wrongQuestions)
      .where(and(
        eq(wrongQuestions.id, id),
        eq(wrongQuestions.familyAccountId, profileId),
      ))
      .returning({ id: wrongQuestions.id });
    if (deleted.length === 0) {
      throw new NotFoundException('错题不存在');
    }
  }
}
