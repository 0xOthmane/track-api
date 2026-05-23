import { Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { AttendanceGateway } from './attendance.gateway';

@Module({
  controllers: [AttendancesController],
  providers: [AttendancesService, AttendanceGateway],
})
export class AttendancesModule {}
