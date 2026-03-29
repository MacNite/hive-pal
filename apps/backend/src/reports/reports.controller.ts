import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiaryContextGuard } from '../guards/apiary-context.guard';
import { ApiaryPermissionGuard } from '../guards/apiary-permission.guard';
import { RequestWithApiary } from '../interface/request-with.apiary';
import { CustomLoggerService } from '../logger/logger.service';
import {
  ApiaryStatisticsDto,
  ApiaryTrendsDto,
  ReportPeriod,
} from './dto/apiary-statistics.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, ApiaryContextGuard, ApiaryPermissionGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('ReportsController');
  }

  @Get('statistics')
  async getApiaryStatistics(
    @Query('period') period: string = ReportPeriod.ALL,
    @Req() req: RequestWithApiary,
  ): Promise<ApiaryStatisticsDto> {
    this.logger.log(
      `Getting statistics for apiary ${req.apiaryId}, period: ${period}, user: ${req.user.id}`,
    );

    // Validate period
    const validPeriods = Object.values(ReportPeriod);
    if (!validPeriods.includes(period as ReportPeriod)) {
      throw new BadRequestException(
        `Invalid period. Valid periods are: ${validPeriods.join(', ')}`,
      );
    }

    return this.reportsService.getApiaryStatistics(
      req.apiaryId,
      period as ReportPeriod,
    );
  }

  @Get('trends')
  async getApiaryTrends(
    @Query('period') period: string = ReportPeriod.ALL,
    @Req() req: RequestWithApiary,
  ): Promise<ApiaryTrendsDto> {
    this.logger.log(
      `Getting trends for apiary ${req.apiaryId}, period: ${period}, user: ${req.user.id}`,
    );

    // Validate period
    const validPeriods = Object.values(ReportPeriod);
    if (!validPeriods.includes(period as ReportPeriod)) {
      throw new BadRequestException(
        `Invalid period. Valid periods are: ${validPeriods.join(', ')}`,
      );
    }

    return this.reportsService.getTrends(req.apiaryId, period as ReportPeriod);
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="apiary-report.csv"')
  async exportCsv(
    @Query('period') period: string = ReportPeriod.ALL,
    @Req() req: RequestWithApiary,
  ): Promise<string> {
    this.logger.log(
      `Exporting CSV for apiary ${req.apiaryId}, period: ${period}, user: ${req.user.id}`,
    );

    // Validate period
    const validPeriods = Object.values(ReportPeriod);
    if (!validPeriods.includes(period as ReportPeriod)) {
      throw new BadRequestException(
        `Invalid period. Valid periods are: ${validPeriods.join(', ')}`,
      );
    }

    return this.reportsService.exportCsv(req.apiaryId, period as ReportPeriod);
  }

  @Get('export/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="apiary-report.pdf"')
  async exportPdf(
    @Query('period') period: string = ReportPeriod.ALL,
    @Req() req: RequestWithApiary,
  ): Promise<StreamableFile> {
    this.logger.log(
      `Exporting PDF for apiary ${req.apiaryId}, period: ${period}, user: ${req.user.id}`,
    );

    // Validate period
    const validPeriods = Object.values(ReportPeriod);
    if (!validPeriods.includes(period as ReportPeriod)) {
      throw new BadRequestException(
        `Invalid period. Valid periods are: ${validPeriods.join(', ')}`,
      );
    }

    const buffer = await this.reportsService.exportPdf(
      req.apiaryId,
      period as ReportPeriod,
    );
    return new StreamableFile(buffer);
  }
}
