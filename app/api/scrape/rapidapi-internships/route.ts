import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting RapidAPI Internships scraper...');
    
    // Check API key
    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json({ 
        error: 'RAPIDAPI_KEY environment variable not set' 
      }, { status: 500 });
    }
    
    // Dynamic import to avoid build-time issues
    const { default: RapidAPIInternshipsScraper } = await import('../../../../scrapers/rapidapi-internships');
    
    // Run the scraper
    const results = await RapidAPIInternshipsScraper.scrapeAllQueries();
    
    return NextResponse.json({
      success: true,
      source: 'rapidapi-internships',
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ RapidAPI Internships scraper error:', message);
    
    return NextResponse.json({
      success: false,
      error: message,
      source: 'rapidapi-internships',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
