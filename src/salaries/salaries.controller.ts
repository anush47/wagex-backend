import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SalariesService } from './salaries.service';
import { GenerateSalaryDto, SalaryQueryDto } from './dto/salary.dto';

@ApiTags('salaries')
@Controller('salaries')
export class SalariesController {
    constructor(private readonly salariesService: SalariesService) { }

    @Post('generate-preview')
    @ApiOperation({ summary: 'Generate salary previews without saving' })
    generatePreview(@Body() dto: GenerateSalaryDto) {
        return this.salariesService.generatePreviews(dto);
    }

    @Post('save-drafts/:companyId')
    @ApiOperation({ summary: 'Save generated salary previews as drafts' })
    saveDrafts(@Param('companyId') companyId: string, @Body() groupedPreviews: any[]) {
        return this.salariesService.saveDrafts(companyId, groupedPreviews);
    }

    @Get()
    @ApiOperation({ summary: 'Get all salaries with filtering' })
    findAll(@Query() query: SalaryQueryDto) {
        return this.salariesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get salary by ID' })
    findOne(@Param('id') id: string) {
        return this.salariesService.findOne(id);
    }
}
