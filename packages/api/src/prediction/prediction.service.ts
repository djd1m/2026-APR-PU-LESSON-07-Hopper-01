import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../common/prisma.service';

export interface PredictionResult {
  route: { origin: string; destination: string };
  departure_date: string;
  current_price: { amount: number; currency: string };
  action: 'BUY_NOW' | 'WAIT' | 'INSUFFICIENT_DATA';
  confidence: number;
  direction: 'UP' | 'DOWN' | 'STABLE';
  predicted_change_pct: number;
  predicted_price: number;
  explanation: string;
  expected_savings: { amount: number; currency: string } | null;
  wait_days: number | null;
  model_version: string;
  factors: Array<{
    name: string;
    weight: number;
    direction: string;
    value?: string;
  }>;
}

/** Cache TTL: 6 hours in seconds */
const CACHE_TTL = 6 * 60 * 60;

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {
    this.mlServiceUrl = this.configService.get<string>(
      'ML_SERVICE_URL',
      'http://ml:8000',
    );
  }

  /**
   * Get price prediction for a route and date.
   * Calls the ML microservice (FastAPI) via HTTP, with rule-based fallback.
   */
  async predict(
    origin: string,
    destination: string,
    date: string,
    currentPrice: number,
  ): Promise<PredictionResult> {
    const cacheKey = `prediction:${origin}:${destination}:${date}:${currentPrice}`;

    // Check cache (predictions valid for 6 hours)
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Prediction cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.warn('Redis cache read failed, proceeding without cache');
    }

    let prediction: PredictionResult;

    // Try ML microservice first
    try {
      prediction = await this.callMlService(origin, destination, date, currentPrice);
      this.logger.log(`ML prediction received for ${origin}-${destination} on ${date}`);
    } catch (err) {
      this.logger.warn(
        `ML service unavailable (${(err as Error).message}), falling back to rule-based`,
      );
      prediction = this.ruleBased(origin, destination, date, currentPrice);
    }

    // Cache prediction for 6 hours
    try {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(prediction));
    } catch (err) {
      this.logger.warn('Redis cache write failed');
    }

    // Persist prediction to DB (fire-and-forget)
    this.savePrediction(prediction).catch((err) =>
      this.logger.warn(`Failed to save prediction to DB: ${(err as Error).message}`),
    );

    return prediction;
  }

  /**
   * Call the ML microservice (FastAPI) at /predict.
   */
  private async callMlService(
    origin: string,
    destination: string,
    date: string,
    currentPrice: number,
  ): Promise<PredictionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.mlServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          departure_date: date,
          current_price: currentPrice,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }

      const ml = await response.json();

      // Map ML response (Python schema) to PredictionResult
      return this.mapMlResponse(origin, destination, date, currentPrice, ml);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Map ML service response to PredictionResult.
   */
  private mapMlResponse(
    origin: string,
    destination: string,
    date: string,
    currentPrice: number,
    ml: {
      recommendation: string;
      confidence: number;
      predicted_price?: number;
      predicted_change_pct?: number;
      direction: string;
      expected_savings?: number;
      wait_days?: number;
      explanation: string;
      model_version: string;
      factors: Array<{ name: string; weight: number; value: string; direction: string }>;
    },
  ): PredictionResult {
    const actionMap: Record<string, PredictionResult['action']> = {
      BUY_NOW: 'BUY_NOW',
      WAIT: 'WAIT',
      NO_DATA: 'INSUFFICIENT_DATA',
    };

    return {
      route: { origin, destination },
      departure_date: date,
      current_price: { amount: currentPrice, currency: 'RUB' },
      action: actionMap[ml.recommendation] || 'INSUFFICIENT_DATA',
      confidence: ml.confidence,
      direction: ml.direction as PredictionResult['direction'],
      predicted_change_pct: ml.predicted_change_pct ?? 0,
      predicted_price: ml.predicted_price ?? currentPrice,
      explanation: ml.explanation,
      expected_savings: ml.expected_savings
        ? { amount: ml.expected_savings, currency: 'RUB' }
        : null,
      wait_days: ml.wait_days ?? null,
      model_version: ml.model_version,
      factors: ml.factors.map((f) => ({
        name: f.name,
        weight: f.weight,
        direction: f.direction,
        value: f.value,
      })),
    };
  }

  /**
   * Simple rule-based prediction inline fallback.
   * Used when ML service is unavailable.
   */
  private ruleBased(
    origin: string,
    destination: string,
    date: string,
    currentPrice: number,
  ): PredictionResult {
    const departure = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    departure.setHours(0, 0, 0, 0);

    const daysOut = Math.ceil(
      (departure.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysOut < 0) {
      return {
        route: { origin, destination },
        departure_date: date,
        current_price: { amount: currentPrice, currency: 'RUB' },
        action: 'INSUFFICIENT_DATA',
        confidence: 0,
        direction: 'STABLE',
        predicted_change_pct: 0,
        predicted_price: currentPrice,
        explanation: 'Дата вылета уже прошла.',
        expected_savings: null,
        wait_days: null,
        model_version: 'fallback-v1',
        factors: [],
      };
    }

    const factors: PredictionResult['factors'] = [];
    let score = 0;

    // Factor 1: Advance purchase
    if (daysOut > 60) {
      score += -0.2;
      factors.push({ name: 'advance_purchase', weight: -0.2, direction: 'DOWN', value: '60+_days' });
    } else if (daysOut >= 21) {
      score += -0.1;
      factors.push({ name: 'advance_purchase', weight: -0.1, direction: 'DOWN', value: '21-60_days' });
    } else if (daysOut >= 7) {
      score += 0.3;
      factors.push({ name: 'advance_purchase', weight: 0.3, direction: 'UP', value: '7-21_days' });
    } else {
      score += 0.5;
      factors.push({ name: 'advance_purchase', weight: 0.5, direction: 'UP', value: 'last_minute' });
    }

    // Factor 2: Day of week
    const dow = departure.getDay(); // 0=Sun, 1=Mon
    const dowFactors: Record<number, number> = {
      0: 0.15, 1: 0, 2: -0.15, 3: -0.15, 4: 0, 5: 0.15, 6: 0.05,
    };
    const dowFactor = dowFactors[dow] ?? 0;
    if (dowFactor !== 0) {
      score += dowFactor;
      const dowNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      factors.push({
        name: 'day_of_week',
        weight: dowFactor,
        direction: dowFactor > 0 ? 'UP' : 'DOWN',
        value: dowNames[dow],
      });
    }

    // Factor 3: Seasonality
    const month = departure.getMonth() + 1;
    const seasonFactors: Record<number, number> = {
      1: 0.15, 2: -0.1, 3: -0.05, 4: -0.05, 5: 0.05,
      6: 0.2, 7: 0.3, 8: 0.25, 9: 0, 10: -0.1, 11: -0.15, 12: 0.1,
    };
    const seasonFactor = seasonFactors[month] ?? 0;
    if (seasonFactor !== 0) {
      score += seasonFactor;
      factors.push({
        name: 'seasonality',
        weight: seasonFactor,
        direction: seasonFactor > 0 ? 'UP' : 'DOWN',
        value: `month_${month}`,
      });
    }

    // Factor 4: Holiday proximity (simplified)
    const holidays = [
      { m: 1, d: 1, name: 'Новогодние каникулы' },
      { m: 2, d: 23, name: 'День защитника Отечества' },
      { m: 3, d: 8, name: 'Международный женский день' },
      { m: 5, d: 1, name: 'Праздник Весны и Труда' },
      { m: 5, d: 9, name: 'День Победы' },
      { m: 6, d: 12, name: 'День России' },
      { m: 11, d: 4, name: 'День народного единства' },
    ];

    for (const h of holidays) {
      const hDate = new Date(departure.getFullYear(), h.m - 1, h.d);
      const daysDiff = Math.ceil(
        (hDate.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff >= -1 && daysDiff <= 14) {
        score += 0.25;
        factors.push({
          name: 'holiday',
          weight: 0.25,
          direction: 'UP',
          value: h.name,
        });
        break;
      }
    }

    // Calculate prediction
    const confidence = Math.min(0.7, 0.5 + Math.abs(score) * 0.3);

    let action: PredictionResult['action'];
    let direction: PredictionResult['direction'];
    let explanation: string;
    let predictedChangePct: number;
    let predictedPrice: number;
    let expectedSavings: PredictionResult['expected_savings'] = null;
    let waitDays: number | null = null;

    if (score > 0.15) {
      direction = 'UP';
      action = 'BUY_NOW';
      predictedChangePct = Math.round(score * 100) / 10;
      predictedPrice = Math.round(currentPrice * (1 + predictedChangePct / 100));
      const confPct = Math.round(confidence * 100);
      const reasons = factors
        .filter((f) => f.direction === 'UP')
        .map((f) => {
          if (f.name === 'advance_purchase') return 'до вылета менее 3 недель';
          if (f.name === 'day_of_week') return 'пиковый день недели';
          if (f.name === 'seasonality') return 'высокий сезон';
          if (f.name === 'holiday') return `приближаются праздники (${f.value})`;
          return f.name;
        });
      explanation = `Рекомендуем купить сейчас (уверенность ${confPct}%): ${reasons.join('; ')}.`;
    } else if (score < -0.15) {
      direction = 'DOWN';
      action = 'WAIT';
      predictedChangePct = Math.round(score * 100) / 10;
      predictedPrice = Math.round(currentPrice * (1 + predictedChangePct / 100));

      if (daysOut > 30) waitDays = Math.min(7, Math.round(Math.abs(score) * 10));
      else if (daysOut > 14) waitDays = Math.min(3, Math.round(Math.abs(score) * 5));
      else waitDays = 1;

      const savingsPct = Math.min(0.3, Math.abs(score) * 0.15);
      const savingsAmt = Math.round(currentPrice * savingsPct);
      expectedSavings = { amount: savingsAmt, currency: 'RUB' };

      const confPct = Math.round(confidence * 100);
      const reasons = factors
        .filter((f) => f.direction === 'DOWN')
        .map((f) => {
          if (f.name === 'advance_purchase') return 'до вылета ещё далеко';
          if (f.name === 'day_of_week') return 'вылет во вторник/среду';
          if (f.name === 'seasonality') return 'низкий сезон';
          return f.name;
        });
      explanation = `Рекомендуем подождать ${waitDays} дн. (уверенность ${confPct}%): ${reasons.join('; ')}. Потенциальная экономия: ~${savingsAmt.toLocaleString('ru-RU')} ₽.`;
    } else {
      direction = 'STABLE';
      action = 'BUY_NOW';
      predictedChangePct = 0;
      predictedPrice = currentPrice;
      explanation = 'Цена стабильна. Существенных изменений не ожидается.';
    }

    return {
      route: { origin, destination },
      departure_date: date,
      current_price: { amount: currentPrice, currency: 'RUB' },
      action,
      confidence: Math.round(confidence * 1000) / 1000,
      direction,
      predicted_change_pct: predictedChangePct,
      predicted_price: predictedPrice,
      explanation,
      expected_savings: expectedSavings,
      wait_days: waitDays,
      model_version: 'fallback-v1',
      factors,
    };
  }

  /**
   * Persist prediction to the PricePrediction table.
   */
  private async savePrediction(prediction: PredictionResult): Promise<void> {
    await this.prisma.pricePrediction.create({
      data: {
        origin: prediction.route.origin,
        destination: prediction.route.destination,
        departure_date: new Date(prediction.departure_date),
        predicted_price: prediction.predicted_price,
        confidence: prediction.confidence,
        recommendation: prediction.action as 'BUY_NOW' | 'WAIT' | 'INSUFFICIENT_DATA',
        predicted_change_pct: prediction.predicted_change_pct,
        valid_until: new Date(Date.now() + CACHE_TTL * 1000),
        model_version: prediction.model_version,
      },
    });
  }
}
