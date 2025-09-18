import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/Utils/constants';
import { errorResponse } from '@/Utils/errorResponse';

// Simple scrape endpoint for production
export async function POST(req: NextRequest) {
  try {
    const { platforms = ['all'] } = await req.json();
    
    console.log(`🚀 Scrape request for platforms: ${platforms.join(', ')}`);
    
    // For production, this endpoint is handled by the automation system
    // Users don't need to manually trigger scraping
    
    return NextResponse.json({
      success: true,
      message: 'Scraping is automated and runs every hour',
      platforms: platforms,
      note: 'Jobs are automatically scraped and delivered to your email every 48 hours'
    });
    
  } catch (error) {
    console.error('Scrape request failed:', error);
    return errorResponse.internal(req, 'Scrape request failed', 'Please try again later or contact support');
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Scrape endpoint active',
    note: 'Use POST to trigger scraping (though it\'s automated)',
    automation: 'Jobs are scraped automatically every hour'
  });
}
