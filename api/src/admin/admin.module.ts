import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AppLoggerModule } from '../app-logger/app-logger.module';

@Module({
  imports: [AppLoggerModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
