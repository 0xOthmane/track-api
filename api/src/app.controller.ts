import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'Get API health status' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  async getHealth() {
    return await this.appService.getHealth();
  }
}
