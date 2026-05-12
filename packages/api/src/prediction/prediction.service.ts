import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis.service';

export interface PredictionResult {
  route: { origin: string; destination: string };
  departure_date: string;
  current_price: { amount: number; currency: string };
  action: 'BUY_NOW' | 'WAIT' | 'INSUFFICIENT_DATA';
  confidence: number;
  direction: 'UP' | 'DOWN' | 'STABLE';
  predicted_change_pct: number;
  explanation: string;
  expected_savings: { amount: number; currency: string } | null;
  wait_days: number | null;
  model_version: string;
  factors: Array<{
    name: string;
    weight: number;
    direction: string;
  }>;
}

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get price prediction for a route and date.
   * Calls the ML microservice (FastAPI) via HTTP, with rule-based fallback.
   */
  async predict(route: string, date: string): Promise<PredictionResult> {
    const [origin, destination] = route.split('-');
    const cacheKey = `prediction:${origin}:${destination}:${date}`;

    // Check cache (predictions valid for 6 hours)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Prediction cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    // TODO: Call ML microservice at ML_SERVICE_URL
    // const mlUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://ml:8000');
    // try {
    //   const response = await fetch(`${mlUrl}/predict`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ origin, destination, departure_date: date }),
    //   });
    //   if (response.ok) {
    //     const mlResult = await response.json();
    //     // Transform ML response to PredictionResult
    //   }
    // } catch (error) {
    //   this.logger.warn('ML service unavailable, falling back to rule-based');
    // }

    // Fallback: rule-based prediction stub
    const prediction: PredictionResult = {
      route: { origin, destination },
      departure_date: date,
      current_price: { amount: 8500, currency: 'RUB' },
      action: 'BUY_NOW',
      confidence: 0.68,
      direction: 'UP',
      predicted_change_pct: 12.5,
      explanation:
        'Цена с вероятностью 68% вырастет. Факторы: до вылета 14 дней (+), летний сезон (+).',
      expected_savings: null,
      wait_days: null,
      model_version: 'rule-v1',
      factors: [
        { name: 'advance_purchase', weight: 0.3, direction: 'UP' },
        { name: 'seasonality', weight: 0.25, direction: 'UP' },
        { name: 'day_of_week', weight: -0.15, direction: 'DOWN' },
      ],
    };

    // Cache for 6 hours
    await this.redis.setex(cacheKey, 21600, JSON.stringify(prediction));

    return prediction;
  }
}
