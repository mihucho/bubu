import { Module } from '@nestjs/common';
import { ParentController } from './parent.controller';
import { ParentSettingsController } from './settings.controller';
import { ParentExtraController } from './extra.controller';
import { ParentAccountService, ParentExportService, ParentSearchService } from './extra.service';
import { ParentBadgeService, ParentFamilyService, ParentShopService } from './settings.service';
import {
  ParentRecordsService,
  ParentReportService,
  ParentService,
  ParentTasksService,
  ParentWishesService,
} from './parent.service';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [FamilyModule],
  controllers: [ParentController, ParentSettingsController, ParentExtraController],
  providers: [ParentService, ParentTasksService, ParentWishesService, ParentReportService, ParentRecordsService, ParentShopService, ParentBadgeService, ParentFamilyService, ParentSearchService, ParentExportService, ParentAccountService],
  exports: [ParentService, ParentTasksService, ParentWishesService, ParentReportService, ParentRecordsService, ParentShopService, ParentBadgeService, ParentFamilyService, ParentSearchService, ParentExportService, ParentAccountService],
})
export class ParentModule {}
