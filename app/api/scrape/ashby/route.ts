import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Ashby scraper...');
    
    // Run the Ashby scraper
    const { stdout, stderr } = await execAsync('npx tsc scrapers/ashby.ts --outDir scrapers --target es2020 --module commonjs && node -e "const S=require(\'./scrapers/ashby.js\').default; new S().scrapeAllCompanies().then(r=>console.log(JSON.stringify(r.metrics))).catch(console.error)"', {
      timeout: 300000, // 5 minutes timeout
      cwd: process.cwd()
    });

    if (stderr) {
      console.error('Ashby scraper stderr:', stderr);
    }

    console.log('Ashby scraper output:', stdout);
    
    // Try to parse metrics from stdout
    let metrics = {};
    try {
      const lines = stdout.split('\n');
      const metricsLine = lines.find(line => line.includes('{') && line.includes('}'));
      if (metricsLine) {
        metrics = JSON.parse(metricsLine);
      }
    } catch (e) {
      console.log('Could not parse metrics from stdout');
    }

    return NextResponse.json({
      success: true,
      message: 'Ashby scraper completed successfully',
      metrics: metrics,
      output: stdout
    });

  } catch (error: any) {
    console.error('❌ Ashby scraper error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Ashby scraper failed',
      error: error.message,
      output: error.stdout || '',
      stderr: error.stderr || ''
    }, { status: 500 });
  }
}
