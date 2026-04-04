'use client';

const colors: Record<string, string> = {
  refund: '#10b981',
  voucher: '#f59e0b',
  subsidy: '#ec4899',
  loan: '#3b82f6',
  grant: '#8b5cf6',
  education: '#06b6d4',
  housing: '#14b8a6',
  medical: '#ef4444',
  employment: '#f97316',
  culture: '#a855f7',
};

const bgColors: Record<string, string> = {
  refund: '#ecfdf5',
  voucher: '#fffbeb',
  subsidy: '#fdf2f8',
  loan: '#eff6ff',
  grant: '#f5f3ff',
  education: '#ecfeff',
  housing: '#f0fdfa',
  medical: '#fef2f2',
  employment: '#fff7ed',
  culture: '#faf5ff',
};

interface Props {
  slug: string;
  size?: number;
  className?: string;
  withBg?: boolean;
}

export default function CategoryIcon({ slug, size = 28, className = '', withBg = false }: Props) {
  const color = colors[slug] || '#6b7280';
  const bg = bgColors[slug] || '#f3f4f6';
  const svgProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '1.8', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  const icon = (() => {
    switch (slug) {
      case 'refund':
        return <svg {...svgProps}><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.5-1.5-3-1.5-2 0-3 1-3 2.5s1 2 3 2.5 3 1.5 3 2.5-1 2.5-3 2.5c-1.5 0-2.5-.5-3-1.5"/><path d="M12 6v1.5M12 16.5V18"/></svg>;
      case 'voucher':
        return <svg {...svgProps}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="15" r="1.5"/><circle cx="8" cy="15" r="1.5"/></svg>;
      case 'subsidy':
        return <svg {...svgProps}><path d="M12 2v6M9 5h6"/><path d="M5 12a7 7 0 0014 0"/><path d="M8.5 11l3.5 3 3.5-3"/><path d="M12 14v5"/><circle cx="12" cy="21" r="1"/></svg>;
      case 'loan':
        return <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v6"/><path d="M9 14l2 2 4-4"/></svg>;
      case 'grant':
        return <svg {...svgProps}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>;
      case 'education':
        return <svg {...svgProps}><path d="M22 10l-10-5L2 10l10 5 10-5z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/><path d="M22 10v6"/></svg>;
      case 'housing':
        return <svg {...svgProps}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>;
      case 'medical':
        return <svg {...svgProps}><path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3"/><path d="M8 15v1a6 6 0 006 6 6 6 0 006-6v-4"/><path d="M11 8h2M12 7v2"/></svg>;
      case 'employment':
        return <svg {...svgProps}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><path d="M12 12v4"/><path d="M10 14h4"/></svg>;
      case 'culture':
        return <svg {...svgProps}><circle cx="13.5" cy="6.5" r="2.5"/><path d="M2 21c.6-5.7 5-10 10.5-10a11 11 0 019.5 5"/><path d="M17 16l2 4h3"/></svg>;
      default:
        return <svg {...svgProps}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>;
    }
  })();

  if (withBg) {
    return <div className={`inline-flex items-center justify-center rounded-xl ${className}`} style={{ backgroundColor: bg, width: size * 1.8, height: size * 1.8 }}>{icon}</div>;
  }
  return <span className={className}>{icon}</span>;
}