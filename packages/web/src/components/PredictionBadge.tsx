'use client';

import { useState } from 'react';

export interface PredictionData {
  recommendation: 'BUY_NOW' | 'WAIT' | 'NO_DATA' | 'INSUFFICIENT_DATA';
  confidence: number;
  explanation?: string;
  expected_savings?: { amount: number; currency: string } | null;
  wait_days?: number | null;
  predicted_change_pct?: number;
}

interface PredictionBadgeProps {
  prediction: PredictionData;
  onFreeze?: () => void;
}

const CONFIG = {
  BUY_NOW: {
    label: 'Купить сейчас',
    bgColor: 'bg-prediction-buy/10',
    textColor: 'text-prediction-buy',
    dotColor: 'bg-prediction-buy',
    borderColor: 'border-prediction-buy/30',
  },
  WAIT: {
    label: 'Подождать',
    bgColor: 'bg-prediction-wait/10',
    textColor: 'text-prediction-wait',
    dotColor: 'bg-prediction-wait',
    borderColor: 'border-prediction-wait/30',
  },
  NO_DATA: {
    label: 'Нет данных',
    bgColor: 'bg-prediction-nodata/10',
    textColor: 'text-prediction-nodata',
    dotColor: 'bg-prediction-nodata',
    borderColor: 'border-prediction-nodata/30',
  },
  INSUFFICIENT_DATA: {
    label: 'Нет данных',
    bgColor: 'bg-prediction-nodata/10',
    textColor: 'text-prediction-nodata',
    dotColor: 'bg-prediction-nodata',
    borderColor: 'border-prediction-nodata/30',
  },
};

export function PredictionBadge({ prediction, onFreeze }: PredictionBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const config = CONFIG[prediction.recommendation];
  const confidencePct = Math.round(prediction.confidence * 100);
  const hasDetails = !!(prediction.explanation || prediction.expected_savings || prediction.wait_days);
  const showFreeze = onFreeze && (prediction.recommendation === 'BUY_NOW' || prediction.recommendation === 'WAIT');

  return (
    <div className="inline-block">
      {/* Badge */}
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${hasDetails ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        onClick={(e) => {
          if (hasDetails) {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(!expanded);
          }
        }}
        title={`Уверенность: ${confidencePct}%`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        {config.label}
        {prediction.recommendation !== 'NO_DATA' && prediction.recommendation !== 'INSUFFICIENT_DATA' && (
          <span className="opacity-70">{confidencePct}%</span>
        )}
        {hasDetails && (
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Expandable explanation */}
      {expanded && hasDetails && (
        <div
          className={`mt-2 p-3 rounded-lg border text-xs text-left ${config.bgColor} ${config.borderColor} ${config.textColor}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {prediction.explanation && (
            <p className="mb-2">{prediction.explanation}</p>
          )}

          {prediction.wait_days != null && (
            <p className="opacity-80">
              Ожидание: ~{prediction.wait_days} дн.
            </p>
          )}

          {prediction.expected_savings && prediction.expected_savings.amount > 0 && (
            <p className="opacity-80">
              Экономия: ~{prediction.expected_savings.amount.toLocaleString('ru-RU')} ₽
            </p>
          )}

          {prediction.predicted_change_pct != null && prediction.predicted_change_pct !== 0 && (
            <p className="opacity-80">
              Прогноз изменения: {prediction.predicted_change_pct > 0 ? '+' : ''}{prediction.predicted_change_pct}%
            </p>
          )}

          {showFreeze && (
            <button
              type="button"
              className="mt-2 w-full px-3 py-1.5 rounded bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFreeze();
              }}
            >
              Заморозить цену
            </button>
          )}
        </div>
      )}
    </div>
  );
}
