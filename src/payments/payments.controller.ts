import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @ApiOperation({ summary: 'Record a new payment' })
    create(@Body() dto: CreatePaymentDto) {
        return this.paymentsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all payments for a company' })
    findAll(@Query('companyId') companyId: string) {
        return this.paymentsService.findAll(companyId);
    }
}
