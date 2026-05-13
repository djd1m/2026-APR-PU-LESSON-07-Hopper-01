import { Controller, Post, Body, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { YooKassaService } from './yookassa.service';

/**
 * Payment endpoints.
 * POST /api/payments/webhook — YooKassa webhook callback
 * GET  /api/payments/:id — Check payment status
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly yookassa: YooKassaService) {}

  /**
   * YooKassa sends webhook notifications here when payment status changes.
   * Configure in YooKassa dashboard: https://yookassa.ru/my/ → Settings → Webhooks
   * URL: https://your-domain/api/payments/webhook
   */
  @Post('webhook')
  @ApiOperation({ summary: 'YooKassa webhook callback' })
  async handleWebhook(@Body() body: any) {
    this.logger.log(`[Webhook] type=${body.event}, payment_id=${body.object?.id}`);

    const event = body.event; // "payment.succeeded", "payment.canceled", "refund.succeeded"
    const payment = body.object;

    if (event === 'payment.succeeded') {
      this.logger.log(`Payment ${payment.id} succeeded: ${payment.amount?.value} ${payment.amount?.currency}`);
      // TODO: Update booking status to CONFIRMED, send confirmation notification
    }

    if (event === 'payment.canceled') {
      this.logger.warn(`Payment ${payment.id} canceled`);
      // TODO: Update booking status to CANCELLED
    }

    if (event === 'refund.succeeded') {
      this.logger.log(`Refund ${payment.id} succeeded: ${payment.amount?.value} ${payment.amount?.currency}`);
      // TODO: Update protection/booking with refund info
    }

    return { status: 'ok' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Check payment status' })
  async getPayment(@Param('id') id: string) {
    return this.yookassa.getPayment(id);
  }
}
