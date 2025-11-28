/**
 * Cleanup .env.local file
 * 
 * Analyzes what environment variables are actually used in the codebase
 * and helps identify orphaned/unused variables
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Get all environment variables defined in lib/env.ts schema
const schemaVars = [
  // Core Application
  'NODE_ENV',
  'NEXT_PUBLIC_URL',
  'NEXT_PUBLIC_DOMAIN',
  'VERCEL_URL',
  
  // Database (Supabase)
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  
  // AI Services (OpenAI)
  'OPENAI_API_KEY',
  'AI_TIMEOUT_MS',
  'AI_MAX_RETRIES',
  
  // Email (Resend)
  'RESEND_API_KEY',
  'EMAIL_DOMAIN',
  
  // Payments (Polar)
  'POLAR_ACCESS_TOKEN',
  'POLAR_WEBHOOK_SECRET',
  'POLAR_SUCCESS_URL',
  
  // Caching (Redis)
  'REDIS_URL',
  'CACHE_TTL_MS',
  
  // Security & Authentication
  'INTERNAL_API_HMAC_SECRET',
  'ADMIN_API_KEY',
  'ADMIN_BASIC_USER',
  'ADMIN_BASIC_PASS',
  'SYSTEM_API_KEY',
  'UNSUBSCRIBE_SECRET',
  'PREFERENCES_SECRET',
  'EMAIL_VERIFICATION_SECRET',
  
  // Job Matching Configuration
  'FREE_JOBS_PER_USER',
  'PREMIUM_JOBS_PER_USER',
  'AI_MAX_CALLS_PER_USER',
  'MATCH_USERS_DISABLE_AI',
  'USE_NEW_MATCHING',
  'USE_ENHANCED_CACHE',
  
  // Scraping Configuration
  'REED_API_KEY',
  'ADZUNA_APP_ID',
  'ADZUNA_APP_KEY',
  'SCRAPING_BATCH_SIZE',
  'MAX_PROCESSING_TIME',
  'REED_PAGE_DELAY_MS',
  'REED_PAGE_DELAY_JITTER_MS',
  'REED_BACKOFF_DELAY_MS',
  'REED_RESULTS_PER_PAGE',
  'REED_MAX_QUERIES_PER_LOCATION',
  'ADZUNA_RESULTS_PER_PAGE',
  'ADZUNA_MAX_DAYS_OLD',
  'ADZUNA_PAGE_DELAY_MS',
  'ADZUNA_PAGE_DELAY_JITTER_MS',
  'ADZUNA_TIMEOUT_MS',
  'ADZUNA_MAX_PAGES',
  'ADZUNA_MAX_QUERIES_PER_CITY',
  'SCRAPER_CYCLE_JOB_TARGET',
  'ENABLE_SCRAPER_TELEMETRY',
  
  // Cleanup Configuration
  'CLEANUP_MAX_AGE_DAYS',
  'CLEANUP_BATCH_SIZE',
  'CLEANUP_MAX_DELETIONS',
  'CLEANUP_SAFETY_THRESHOLD',
  'CLEANUP_BATCH_DELAY_MS',
  'CLEANUP_SECRET',
  
  // Logging
  'LOG_LEVEL',
  
  // Legacy/Development
  'SUPABASE_PROJECT_REF_DEV',
  'SUPABASE_PAT_DEV_RW',
  'SUPABASE_PROJECT_REF_PROD',
  'SUPABASE_PAT_PROD_RO',
];

// Additional vars that might be used but not in schema
const additionalUsedVars = [
  'SUPABASE_URL', // Alternative name
  'SUPABASE_KEY', // Alternative name
  'MUSE_API_KEY',
  'GREENHOUSE_API_KEY',
  'JOBPING_API_KEY',
  'SENTRY_DSN',
  'SKIP_ADZUNA',
];

// Variable name mappings (old name -> new name)
const variableRenames: Record<string, string> = {
  'OPEN_API_KEY': 'OPENAI_API_KEY',
  'OPEN_AI_API_KEY': 'OPENAI_API_KEY',
  'OPENAIKEY': 'OPENAI_API_KEY',
  'OPENAI_KEY': 'OPENAI_API_KEY',
};

const allValidVars = new Set([...schemaVars, ...additionalUsedVars]);

function parseEnvFile(content: string): Map<string, string> {
  const vars = new Map<string, string>();
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Parse KEY=VALUE
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      vars.set(key, value);
    }
  }
  
  return vars;
}

function formatEnvFile(vars: Map<string, string>, validVars: Set<string>): string {
  const lines: string[] = [];
  
  // Group variables by category
  const categories: Record<string, string[]> = {
    'Core Application': [
      'NODE_ENV',
      'NEXT_PUBLIC_URL',
      'NEXT_PUBLIC_DOMAIN',
      'VERCEL_URL',
    ],
    'Database (Supabase)': [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'SUPABASE_KEY',
    ],
    'AI Services (OpenAI)': [
      'OPENAI_API_KEY',
      'AI_TIMEOUT_MS',
      'AI_MAX_RETRIES',
    ],
    'Email (Resend)': [
      'RESEND_API_KEY',
      'EMAIL_DOMAIN',
    ],
    'Payments (Polar)': [
      'POLAR_ACCESS_TOKEN',
      'POLAR_WEBHOOK_SECRET',
      'POLAR_SUCCESS_URL',
    ],
    'Caching (Redis)': [
      'REDIS_URL',
      'CACHE_TTL_MS',
    ],
    'Security & Authentication': [
      'INTERNAL_API_HMAC_SECRET',
      'ADMIN_API_KEY',
      'ADMIN_BASIC_USER',
      'ADMIN_BASIC_PASS',
      'SYSTEM_API_KEY',
      'UNSUBSCRIBE_SECRET',
      'PREFERENCES_SECRET',
      'EMAIL_VERIFICATION_SECRET',
    ],
    'Job Matching Configuration': [
      'FREE_JOBS_PER_USER',
      'PREMIUM_JOBS_PER_USER',
      'AI_MAX_CALLS_PER_USER',
      'MATCH_USERS_DISABLE_AI',
      'USE_NEW_MATCHING',
      'USE_ENHANCED_CACHE',
    ],
    'Scraping Configuration': [
      'REED_API_KEY',
      'ADZUNA_APP_ID',
      'ADZUNA_APP_KEY',
      'MUSE_API_KEY',
      'GREENHOUSE_API_KEY',
      'SCRAPING_BATCH_SIZE',
      'MAX_PROCESSING_TIME',
      'REED_PAGE_DELAY_MS',
      'REED_PAGE_DELAY_JITTER_MS',
      'REED_BACKOFF_DELAY_MS',
      'REED_RESULTS_PER_PAGE',
      'REED_MAX_QUERIES_PER_LOCATION',
      'ADZUNA_RESULTS_PER_PAGE',
      'ADZUNA_MAX_DAYS_OLD',
      'ADZUNA_PAGE_DELAY_MS',
      'ADZUNA_PAGE_DELAY_JITTER_MS',
      'ADZUNA_TIMEOUT_MS',
      'ADZUNA_MAX_PAGES',
      'ADZUNA_MAX_QUERIES_PER_CITY',
      'SCRAPER_CYCLE_JOB_TARGET',
      'ENABLE_SCRAPER_TELEMETRY',
      'SKIP_ADZUNA',
    ],
    'Cleanup Configuration': [
      'CLEANUP_MAX_AGE_DAYS',
      'CLEANUP_BATCH_SIZE',
      'CLEANUP_MAX_DELETIONS',
      'CLEANUP_SAFETY_THRESHOLD',
      'CLEANUP_BATCH_DELAY_MS',
      'CLEANUP_SECRET',
    ],
    'Logging & Monitoring': [
      'LOG_LEVEL',
      'SENTRY_DSN',
    ],
    'Legacy/Development': [
      'SUPABASE_PROJECT_REF_DEV',
      'SUPABASE_PAT_DEV_RW',
      'SUPABASE_PROJECT_REF_PROD',
      'SUPABASE_PAT_PROD_RO',
      'JOBPING_API_KEY',
    ],
  };
  
  // Add categorized variables
  for (const [category, varNames] of Object.entries(categories)) {
    const categoryVars = varNames.filter(v => vars.has(v));
    if (categoryVars.length > 0) {
      lines.push(`# ${category}`);
      for (const varName of categoryVars) {
        const value = vars.get(varName)!;
        lines.push(`${varName}=${value}`);
      }
      lines.push('');
    }
  }
  
  // Add any remaining valid variables not in categories
  const remaining = Array.from(vars.keys())
    .filter(k => validVars.has(k) && !Object.values(categories).flat().includes(k));
  
  if (remaining.length > 0) {
    lines.push('# Other Valid Variables');
    for (const varName of remaining.sort()) {
      const value = vars.get(varName)!;
      lines.push(`${varName}=${value}`);
    }
    lines.push('');
  }
  
  return lines.join('\n').trim() + '\n';
}

function main() {
  const envPath = join(process.cwd(), '.env.local');
  
  if (!existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    process.exit(1);
  }
  
  console.log('📖 Reading .env.local...');
  const content = readFileSync(envPath, 'utf-8');
  const envVars = parseEnvFile(content);
  
  console.log(`\n📊 Found ${envVars.size} environment variables\n`);
  
  // Categorize variables
  const valid: string[] = [];
  const orphaned: string[] = [];
  
  // Apply renames
  const renamed: Map<string, string> = new Map();
  for (const [key, value] of envVars.entries()) {
    const newKey = variableRenames[key] || key;
    if (newKey !== key) {
      console.log(`   🔄 Renaming: ${key} -> ${newKey}`);
      renamed.set(newKey, value);
      envVars.delete(key);
    } else {
      renamed.set(key, value);
    }
  }
  
  // Update envVars with renamed values
  envVars.clear();
  for (const [key, value] of renamed.entries()) {
    envVars.set(key, value);
  }
  
  for (const [key, value] of envVars.entries()) {
    if (allValidVars.has(key)) {
      valid.push(key);
    } else {
      orphaned.push(key);
    }
  }
  
  console.log('✅ Valid variables (used in codebase):');
  console.log(`   ${valid.length} variables`);
  valid.sort().forEach(v => console.log(`   - ${v}`));
  
  if (orphaned.length > 0) {
    console.log('\n⚠️  Orphaned variables (not found in codebase):');
    console.log(`   ${orphaned.length} variables`);
    orphaned.sort().forEach(v => console.log(`   - ${v}`));
    console.log('\n💡 These can be safely removed if you\'re not using them.');
  }
  
  // Create cleaned version
  const cleaned = formatEnvFile(envVars, allValidVars);
  const backupPath = envPath + '.backup';
  const cleanedPath = envPath + '.cleaned';
  
  console.log('\n💾 Creating backup and cleaned version...');
  writeFileSync(backupPath, content);
  writeFileSync(cleanedPath, cleaned);
  
  console.log(`\n✅ Backup saved to: ${backupPath}`);
  console.log(`✅ Cleaned version saved to: ${cleanedPath}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Review the cleaned version');
  console.log('   2. If it looks good, replace .env.local with the cleaned version:');
  console.log(`      mv ${cleanedPath} ${envPath}`);
  console.log('   3. Keep the backup until you\'re sure everything works');
}

main();

