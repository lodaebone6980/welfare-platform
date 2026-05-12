'use client';

import { useEffect, useRef } from 'react';

type AdSlotProps = {
  /** AdSense ad unit slot id (data-ad-slot) */
  slot?: string;
  /** Layout type: 'display' (default auto), 'in-article', 'in-feed' */
  layout?: 'display' | 'in-article' | 'in-feed';
  /** Extra className for wrapper */
  className?: string;
  /** Minimum height while ad loads (px) */
  minHeight?: number;
  /** Optional label shown above the ad */
  label?: string;
};

/**
 * AdSlot renders a Google AdSense unit only after ad units are explicitly enabled.
 * - Keep NEXT_PUBLIC_ADSENSE_UNITS_ENABLED=0 during reapproval to avoid empty ad inventory.
 * - The root layout can still load the AdSense review script when the client id is configured.
 * - Safe to re-render thanks to a guarded push().
 */
export default function AdSlot({
  slot,
  layout = 'display',
  className = '',
  minHeight = 100,
  label,
}: AdSlotProps) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const unitsEnabled = process.env.NEXT_PUBLIC_ADSENSE_UNITS_ENABLED === '1';
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!client) return;
    if (!unitsEnabled) return;
    if (pushedRef.current) return;
    try {
      // @ts-expect-error adsbygoogle is injected at runtime
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (e) {
      // swallow — network/blocker related, no-op
    }
  }, [client, unitsEnabled]);

  if (!client || !unitsEnabled) return null;

  const adProps: Record<string, string> = {
    'data-ad-client': client,
  };
  if (slot) adProps['data-ad-slot'] = slot;
  if (layout === 'display') {
    adProps['data-ad-format'] = 'auto';
    adProps['data-full-width-responsive'] = 'true';
  } else if (layout === 'in-article') {
    adProps['data-ad-layout'] = 'in-article';
    adProps['data-ad-format'] = 'fluid';
  } else if (layout === 'in-feed') {
    adProps['data-ad-format'] = 'fluid';
  }

  return (
    <div
      className={'ad-slot w-full ' + className}
      style={{ minHeight, overflow: 'hidden' }}
      aria-label={label || '광고'}
    >
      {label && (
        <div className="mb-1 text-center text-xs uppercase tracking-wide text-gray-400">
          {label}
        </div>
      )}
      <ins
        ref={insRef as any}
        className="adsbygoogle"
        style={{ display: 'block', minHeight }}
        {...adProps}
      />
    </div>
  );
}
