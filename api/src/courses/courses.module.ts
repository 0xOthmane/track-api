import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { CapacityPipe } from './pipes/capacity.pipe';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, CapacityPipe],
})
export class CoursesModule {}
