import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

/**
 * YooKassa Payment Service.
 * API: https://yookassa.ru/developers/api
 *
 * Base URL: https://api.yookassa.ru/v3
 * Auth: Basic <shopId>:<secretKey>
 *
 * Test mode: register at https://yookassa.ru/joinups?createTestShop=true
 * Test cards:
 *   Success: 5555555555554444 (MC), 4111111111111111 (Visa)
 *   With 3DS: 2200000000000004 (MIR)
 *   Decline:  5555555555554642 (insufficient funds)
 */

const API_URL = 'https://api.yookassa.ru/v3';

export interface YooKassaPaymentResult {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  confirmation_url: string | null;
  paid: boolean;
  amount: { value: string; currency: string };
  test: boolean;
}

export interface YooKassaRefundResult {
  id: string;
  status: 'succeeded' | 'canceled';
  amount: { value: string; currency: string };
}

@Injectable()
export class YooKassaService {
  private readonly logger = new Logger(YooKassaService.name);
  private readonly shopId: string;
  private readonly secretKey: string;
  private readonly returnUrl: string;

  constructor(private readonly config: ConfigService) {
    this.shopId = this.config.get<string>('YOOKASSA_SHOP_ID', '');
    this.secretKey = this.config.get<string>('YOOKASSA_SECRET', '');
    this.returnUrl = this.config.get<string>(
      'YOOKASSA_RETURN_URL',
      'http://212.192.0.33:7100/bookings',
    );

    if (!this.shopId || !this.secretKey) {
      this.logger.warn(
        'YOOKASSA_SHOP_ID/SECRET not set — payments in mock mode. ' +
        'Register test shop: https://yookassa.ru/joinups?createTestShop=true',
      );
    } else {
      this.logger.log(`YooKassa initialized: shopId=${this.shopId}`);
    }
  }

  isAvailable(): boolean {
    return !!this.shopId && !!this.secretKey && this.shopId !== 'test_shop_id';
  }

  /**
   * Create a payment in YooKassa.
   * Returns confirmation_url — redirect user there to complete payment.
   */
  async createPayment(
    amount: number,
    currency: string,
    description: string,
    metadata: Record<string, string>,
  ): Promise<YooKassaPaymentResult> {
    if (!this.isAvailable()) {
      // Mock mode
      this.logger.warn('[MOCK PAYMENT] YooKassa not configured, simulating...');
      return {
        id: `mock-${randomUUID()}`,
        status: 'succeeded',
        confirmation_url: null,
        paid: true,
        amount: { value: amount.toFixed(2), currency },
        test: true,
      };
    }

    const idempotenceKey = randomUUID();

    const body = {
      amount: {
        value: amount.toFixed(2),
        currency: currency || 'RUB',
      },
      capture: true, // Auto-capture (no two-step)
      confirmation: {
        type: 'redirect',
        return_url: this.returnUrl,
      },
      description,
      metadata,
    };

    const resp = await this.request('POST', '/payments', body, idempotenceKey);

    this.logger.log(
      `[YooKassa] Payment created: id=${resp.id}, status=${resp.status}, test=${resp.test}`,
    );

    return {
      id: resp.id,
      status: resp.status,
      confirmation_url: resp.confirmation?.confirmation_url || null,
      paid: resp.paid || false,
      amount: resp.amount,
      test: resp.test || false,
    };
  }

  /**
   * Check payment status.
   */
  async getPayment(paymentId: string): Promise<YooKassaPaymentResult> {
    if (!this.isAvailable() || paymentId.startsWith('mock-')) {
      return {
        id: paymentId,
        status: 'succeeded',
        confirmation_url: null,
        paid: true,
        amount: { value: '0', currency: 'RUB' },
        test: true,
      };
    }

    const resp = await this.request('GET', `/payments/${paymentId}`);
    return {
      id: resp.id,
      status: resp.status,
      confirmation_url: resp.confirmation?.confirmation_url || null,
      paid: resp.paid || false,
      amount: resp.amount,
      test: resp.test || false,
    };
  }

  /**
   * Create a refund.
   */
  async createRefund(
    paymentId: string,
    amount: number,
    currency: string,
    description: string,
  ): Promise<YooKassaRefundResult> {
    if (!this.isAvailable() || paymentId.startsWith('mock-')) {
      this.logger.warn(`[MOCK REFUND] ${amount} ${currency} for payment ${paymentId}`);
      return {
        id: `mock-refund-${randomUUID()}`,
        status: 'succeeded',
        amount: { value: amount.toFixed(2), currency },
      };
    }

    const body = {
      payment_id: paymentId,
      amount: {
        value: amount.toFixed(2),
        currency: currency || 'RUB',
      },
      description,
    };

    const resp = await this.request('POST', '/refunds', body, randomUUID());

    this.logger.log(
      `[YooKassa] Refund created: id=${resp.id}, status=${resp.status}, amount=${resp.amount?.value}`,
    );

    return {
      id: resp.id,
      status: resp.status,
      amount: resp.amount,
    };
  }

  // ─── Private ────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    body?: unknown,
    idempotenceKey?: string,
  ): Promise<any> {
    const url = `${API_URL}${path}`;
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
    if (idempotenceKey) {
      headers['Idempotence-Key'] = idempotenceKey;
    }

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(15000),
    };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const resp = await fetch(url, options);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`YooKassa ${resp.status}: ${text.substring(0, 300)}`);
    }

    return resp.json();
  }
}
