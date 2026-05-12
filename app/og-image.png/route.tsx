import { ImageResponse } from 'next/og';
import { SITE_DESC, SITE_NAME, SITE_URL } from '@/lib/env';

export const runtime = 'edge';
export const alt = SITE_NAME;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f8fafc',
          color: '#0f172a',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 28,
            color: '#166534',
            fontWeight: 700,
          }}
        >
          <span>{SITE_URL.replace('https://', '')}</span>
          <span>2026 정부지원금</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 92,
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: 0,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              display: 'flex',
              width: 880,
              fontSize: 36,
              lineHeight: 1.35,
              color: '#334155',
            }}
          >
            {SITE_DESC}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 18,
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          {['지원금', '복지', '보조금', '환급금'].map((label) => (
            <span
              key={label}
              style={{
                display: 'flex',
                border: '2px solid #bbf7d0',
                background: '#ecfdf5',
                color: '#14532d',
                borderRadius: 999,
                padding: '14px 24px',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
