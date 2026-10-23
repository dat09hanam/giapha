import { Body, Controller, Headers, HttpCode, Inject, Post } from '@nestjs/common';

import { PlanPaymentService } from './plan-payment.service.js';

/**
 * SePay calls this for every transaction on the linked bank account. It authenticates with the
 * webhook API key; the body is checked by the service, not the global DTO pipe, so a field SePay
 * adds later never makes the notice fail and retry.
 */
@Controller('payments/sepay')
export class SepayWebhookController {
  constructor(@Inject(PlanPaymentService) private readonly payments: PlanPaymentService) {}

  @Post('webhook')
  @HttpCode(200)
  async receive(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<{ success: true }> {
    await this.payments.handleSepayWebhook(authorization, body);
    return { success: true };
  }
}
