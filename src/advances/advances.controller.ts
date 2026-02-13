import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdvancesService } from './advances.service';
import { CreateSalaryAdvanceDto } from './dto/create-advance.dto';

@ApiTags('advances')
@Controller('advances')
export class AdvancesController {
    constructor(private readonly advancesService: AdvancesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new salary advance' })
    create(@Body() dto: CreateSalaryAdvanceDto) {
        return this.advancesService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all advances for a company' })
    findAll(@Query('companyId') companyId: string) {
        return this.advancesService.findAll(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get advance by ID' })
    findOne(@Param('id') id: string) {
        return this.advancesService.findOne(id);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve an advance' })
    approve(@Param('id') id: string) {
        return this.advancesService.approve(id);
    }
}
