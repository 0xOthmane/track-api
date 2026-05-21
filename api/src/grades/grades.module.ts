import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { GRADES_IMPORT_QUEUE } from './grades-import.constants';
import { GradesImportProcessor } from './grades-import.processor';

@Module({
  imports: [BullModule.registerQueue({ name: GRADES_IMPORT_QUEUE })],
  controllers: [GradesController],
  providers: [GradesService, GradesImportProcessor],
})
export class GradesModule {}
