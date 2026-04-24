import { ImageResponse } from 'next/og';
import { getPublicScoreBySlug } from '@/lib/actions/share-score-action';

// Uses Node runtime because @libsql/client (used by getPublicScoreBySlug)
// relies on Node built-ins that aren't available on the Edge runtime.
export const runtime = 'nodejs';
export const alt = 'RolePatch ATS Score';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default async function OpengraphImage({ params }: { params: { slug: string } }) {
  const data = await getPublicScoreBySlug(params.slug);

  const scoreOriginal = data?.score_original ?? 0;
  const scoreTailored = data?.score_tailored ?? 0;
  const role = data?.role || 'engineering';
  const delta = scoreTailored - scoreOriginal;
  const tailoredColor = scoreColor(scoreTailored);
  const originalColor = scoreColor(scoreOriginal);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 20% 20%, #1f2937 0%, #0b0f17 55%, #05080e 100%)',
          color: '#f9fafb',
          fontFamily: 'system-ui, sans-serif',
          padding: 72,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#9ca3af',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 0,
            }}
          >
            RP
          </div>
          <span>RolePatch ATS Score</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            marginTop: 48,
            gap: 18,
          }}
        >
          <span
            style={{
              fontSize: 240,
              fontWeight: 800,
              lineHeight: 1,
              color: tailoredColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {scoreTailored}
          </span>
          <span
            style={{
              fontSize: 56,
              fontWeight: 600,
              color: '#9ca3af',
              paddingBottom: 24,
            }}
          >
            / 100
          </span>
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '14px 26px',
            borderRadius: 999,
            border: '1px solid #374151',
            background: 'rgba(17,24,39,0.6)',
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          <span style={{ color: originalColor, fontVariantNumeric: 'tabular-nums' }}>
            {scoreOriginal}
          </span>
          <span style={{ color: '#6b7280' }}>→</span>
          <span style={{ color: tailoredColor, fontVariantNumeric: 'tabular-nums' }}>
            {scoreTailored}
          </span>
          {delta !== 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 24,
                color: delta > 0 ? '#22c55e' : '#ef4444',
              }}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>

        <div
          style={{
            marginTop: 56,
            fontSize: 36,
            fontWeight: 500,
            color: '#e5e7eb',
            textAlign: 'center',
            maxWidth: 960,
            display: 'flex',
          }}
        >
          An engineer tailored their resume for a {role} role.
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 22,
            color: '#9ca3af',
            display: 'flex',
          }}
        >
          Build yours free at rolepatch.com
        </div>
      </div>
    ),
    { ...size },
  );
}
