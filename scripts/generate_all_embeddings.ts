/**
 * Generate embeddings for all jobs missing embeddings
 * Uses the existing embedding service to batch process jobs
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple possible paths for .env.local
const possiblePaths = [
  path.join(process.cwd(), '.env.local'),
  path.join(__dirname, '..', '.env.local'),
  path.join(__dirname, '.env.local'),
];

let envPath: string | undefined;
for (const envFile of possiblePaths) {
  if (existsSync(envFile)) {
    envPath = envFile;
    console.log(`✅ Found .env.local at: ${envFile}`);
    break;
  }
}

if (!envPath) {
  console.error('❌ Could not find .env.local file!');
  console.error('Searched in:');
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

// Load the env file
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error loading .env.local:', result.error);
  process.exit(1);
}

console.log(`✅ Loaded ${Object.keys(result.parsed || {}).length} variables from .env.local`);

async function generateAllEmbeddings() {
  // Debug: Show sample of loaded env vars (first 20 alphabetically)
  const allEnvKeys = Object.keys(process.env).sort();
  console.log('🔍 Debug: Sample of loaded env vars (first 20):', allEnvKeys.slice(0, 20));
  console.log('🔍 Debug: Total env vars loaded:', allEnvKeys.length);
  
  // Debug: Check what OpenAI-related env vars exist
  const openaiVars = Object.keys(process.env).filter(key => 
    key.toLowerCase().includes('openai') || 
    key.toLowerCase().includes('open_ai') ||
    key.toLowerCase().includes('ai_key') ||
    key.toLowerCase().includes('open')
  );
  console.log('🔍 Debug: OpenAI/AI-related env vars found:', openaiVars);
  
  // Helper function to clean API key (remove quotes, newlines, whitespace)
  const cleanApiKey = (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    return key
      .trim()
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n/g, '') // Remove newlines
      .replace(/\r/g, '') // Remove carriage returns
      .trim();
  };

  // Check for common variations (including cleaned values)
  const openaiKey = cleanApiKey(process.env.OPENAI_API_KEY) || 
                    cleanApiKey(process.env.OPEN_API_KEY) ||  // Common alternative name
                    cleanApiKey(process.env.OPEN_AI_API_KEY) || 
                    cleanApiKey(process.env.openai_api_key) ||
                    cleanApiKey(process.env.OPENAIKEY) ||
                    cleanApiKey(process.env.OPENAI_KEY);
  
  // Verify environment variables BEFORE importing anything that uses them
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration!');
    console.error('Required environment variables:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nMake sure .env.local exists with these variables.');
    process.exit(1);
  }

  if (!openaiKey) {
    console.error('❌ Missing OpenAI API Key!');
    console.error('Required for generating embeddings.');
    console.error('\nLooking for: OPENAI_API_KEY, OPEN_API_KEY, OPEN_AI_API_KEY, openai_api_key, or OPENAIKEY');
    console.error('Found env vars:', openaiVars);
    process.exit(1);
  }

  // Validate the key format
  if (!openaiKey.startsWith('sk-')) {
    console.error('⚠️  Warning: OpenAI API key should start with "sk-"');
    console.error(`   Found: ${openaiKey.substring(0, 10)}...`);
  }

  // Set it to the standard name if it was found under a different name
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY !== openaiKey) {
    process.env.OPENAI_API_KEY = openaiKey;
    console.log(`✅ Cleaned and set OPENAI_API_KEY (${openaiKey.length} chars, starts with ${openaiKey.substring(0, 7)}...)`);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}`);
  console.log(`   Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'}`);
  console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set (' + process.env.OPENAI_API_KEY.substring(0, 7) + '...)' : 'Missing'}\n`);

  // Dynamic imports after env vars are verified
  const { getDatabaseClient } = await import('@/Utils/databasePool');
  const module = await import('@/Utils/matching/embedding.service');
  const embeddingService = (module as any).embeddingService;
  console.log('Debug embeddingService import keys:', Object.keys(module));
  if (!embeddingService) {
    console.error('embeddingService import failed');
  }

  const supabase = getDatabaseClient();
  const BATCH_SIZE = 1000;
  const MAX_JOBS = 15000; // Process all jobs
  
  console.log('Starting embedding generation for all jobs...');
  
  let totalProcessed = 0;
  let totalCost = 0;
  let offset = 0;
  
  while (true) {
    // Fetch batch of jobs without embeddings
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .is('embedding', null)
      .limit(BATCH_SIZE)
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (fetchError) {
      console.error('Error fetching jobs:', fetchError);
      break;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No more jobs to process');
      break;
    }
    
    console.log(`\nProcessing batch: ${jobs.length} jobs (offset: ${offset})`);
    
    try {
      // Generate embeddings using the embedding service
      const embeddings = await embeddingService.batchGenerateJobEmbeddings(jobs as any[]);
      
      // Store embeddings
      await embeddingService.storeJobEmbeddings(embeddings);
      
      totalProcessed += jobs.length;
      
      // Estimate cost (text-embedding-3-small: $0.02 per 1M tokens)
      // Average job text ~500 tokens, so ~$0.00001 per job
      const batchCost = (jobs.length * 500 / 1_000_000) * 0.02;
      totalCost += batchCost;
      
      console.log(`✓ Processed ${jobs.length} jobs, estimated cost: $${batchCost.toFixed(6)}`);
      console.log(`  Total processed: ${totalProcessed}, Total cost: $${totalCost.toFixed(6)}`);
      
      offset += BATCH_SIZE;
      
      // Rate limiting: wait 1 second between batches
      if (jobs.length === BATCH_SIZE) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error processing batch at offset ${offset}:`, error);
      // Continue with next batch
      offset += BATCH_SIZE;
    }
    
    // Safety limit
    if (totalProcessed >= MAX_JOBS) {
      console.log(`Reached max jobs limit: ${MAX_JOBS}`);
      break;
    }
  }
  
  // Final stats
  const coverage = await embeddingService.checkEmbeddingCoverage();
  console.log('\n=== Embedding Generation Complete ===');
  console.log(`Total jobs processed: ${totalProcessed}`);
  console.log(`Estimated total cost: $${totalCost.toFixed(6)}`);
  console.log(`Coverage: ${(coverage.coverage * 100).toFixed(1)}%`);
  console.log(`Jobs with embeddings: ${coverage.withEmbeddings}`);
  console.log(`Jobs without embeddings: ${coverage.total - coverage.withEmbeddings}`);
}

// Run if executed directly
if (require.main === module) {
  generateAllEmbeddings()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { generateAllEmbeddings };

