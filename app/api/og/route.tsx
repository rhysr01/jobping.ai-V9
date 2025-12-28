import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Berlin';
  const count = searchParams.get('count') || '14';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b', // zinc-950
          backgroundImage: 'radial-gradient(circle at top, rgba(139, 92, 246, 0.1), transparent 70%)',
        }}
      >
        <div style={{ display: 'flex', fontSize: 60, fontWeight: 900, color: '#fff', marginBottom: 40 }}>
          JobPing
        </div>
        <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: '#a3a3a3', marginBottom: 20 }}>
          {count} New Jobs Found
        </div>
        <div style={{ display: 'flex', fontSize: 36, color: '#71717a', marginBottom: 40 }}>
          in {city}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#8b5cf6', fontWeight: 600 }}>
          Get Your Free Matches →
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

