'use client';

interface PredictionBadgeProps {
  recommendation: 'BUY_NOW' | 'WAIT' | 'NO_DATA';
  confidence: number;
}

const CONFIG = {
  BUY_NOW: {
    label: 'Купить сейчас',
    bgColor: 'bg-prediction-buy/10',
    textColor: 'text-prediction-buy',
    dotColor: 'bg-prediction-buy',
  },
  WAIT: {
    label: 'Подождать',
    bgColor: 'bg-prediction-wait/10',
    textColor: 'text-prediction-wait',
    dotColor: 'bg-prediction-wait',
  },
  NO_DATA: {
    label: 'Нет данных',
    bgColor: 'bg-prediction-nodata/10',
    textColor: 'text-prediction-nodata',
    dotColor: 'bg-prediction-nodata',
  },
};

export function PredictionBadge({ recommendation, confidence }: PredictionBadgeProps) {
  const config = CONFIG[recommendation];
  const confidencePct = Math.round(confidence * 100);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      title={`Уверенность: ${confidencePct}%`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
      {recommendation !== 'NO_DATA' && (
        <span className="opacity-70">{confidencePct}%</span>
      )}
    </span>
  );
}
