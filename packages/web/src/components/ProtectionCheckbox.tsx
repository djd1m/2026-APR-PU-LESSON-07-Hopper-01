'use client';

interface ProtectionCheckboxProps {
  type: string;
  title: string;
  description: string;
  price: number;
  checked: boolean;
  onChange: () => void;
}

export function ProtectionCheckbox({
  title,
  description,
  price,
  checked,
  onChange,
}: ProtectionCheckboxProps) {
  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' ₽';

  return (
    <label
      className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
        checked
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{title}</span>
          <span className="font-semibold text-primary-500">{formatPrice(price)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </label>
  );
}
