'use client';

import { useVKBridge } from '@/hooks/useVKBridge';

interface VKShareButtonProps {
  /** Savings amount in RUB to display in share message */
  savingsAmount?: number;
  /** Custom share message */
  message?: string;
  /** Link to share (defaults to HopperRU) */
  link?: string;
  /** Button variant */
  variant?: 'primary' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

/**
 * "Share savings via VK" button component.
 * Uses VK Bridge SDK for native sharing when inside VK Mini App,
 * falls back to VK share URL when on web.
 */
export function VKShareButton({
  savingsAmount,
  message,
  link = 'https://hopperru.ru',
  variant = 'primary',
  className = '',
}: VKShareButtonProps) {
  const { isVK, shareToWall, showShareDialog } = useVKBridge();

  const shareMessage =
    message ||
    (savingsAmount
      ? `Я сэкономил(а) ${savingsAmount.toLocaleString('ru-RU')} \u20BD на авиабилетах с HopperRU! AI-прогноз цен помог купить дешевле. Попробуйте: ${link}`
      : `Нашёл(а) дешёвые авиабилеты с AI-прогнозом цен на HopperRU! Попробуйте: ${link}`);

  const handleShare = async () => {
    if (isVK) {
      // Try native share dialog first, fall back to wall post
      const shared = await showShareDialog(link);
      if (!shared) {
        await shareToWall(shareMessage, link);
      }
    } else {
      // Web fallback: open VK share URL
      const url = encodeURIComponent(link);
      const title = encodeURIComponent('HopperRU — AI-предиктор цен на авиабилеты');
      const desc = encodeURIComponent(shareMessage);
      window.open(
        `https://vk.com/share.php?url=${url}&title=${title}&comment=${desc}`,
        '_blank',
        'width=600,height=400'
      );
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleShare}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors ${className}`}
        title="Поделиться в ВКонтакте"
      >
        <VKIcon size={16} />
        <span>VK</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg ${className}`}
    >
      <VKIcon size={20} />
      <span>
        {savingsAmount
          ? `Поделиться экономией ${savingsAmount.toLocaleString('ru-RU')} \u20BD`
          : 'Поделиться в ВКонтакте'}
      </span>
    </button>
  );
}

/** Simple VK logo SVG icon */
function VKIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.785 16.241s.288-.032.436-.192c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.598-.189 1.366 1.258 2.18 1.814.616.42 1.084.328 1.084.328l2.178-.03s1.14-.07.6-.964c-.044-.073-.316-.659-1.624-1.864-1.37-1.262-1.186-1.058.463-3.24.745-1.063 1.043-1.713.95-1.991-.088-.264-.634-.194-.634-.194l-2.45.015s-.182-.025-.317.056c-.132.079-.217.263-.217.263s-.39 1.038-.91 1.92c-1.098 1.862-1.537 1.96-1.716 1.844-.417-.27-.313-1.085-.313-1.663 0-1.808.274-2.562-.534-2.758-.268-.065-.465-.108-1.15-.115-.879-.009-1.623.003-2.043.209-.28.137-.496.442-.364.46.162.021.531.099.726.365.252.343.243 1.114.243 1.114s.145 2.13-.338 2.393c-.332.181-.787-.188-1.765-1.878-.501-.865-.88-1.822-.88-1.822s-.073-.179-.203-.275c-.158-.117-.379-.154-.379-.154l-2.327.015s-.35.01-.478.162c-.114.134-.009.412-.009.412s1.834 4.29 3.91 6.452c1.903 1.983 4.064 1.852 4.064 1.852h.98z" />
    </svg>
  );
}
