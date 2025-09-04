#!/usr/bin/env node

/**
 * Set AI Cost Limits for Different Environments
 * Run with: node scripts/set-cost-limits.js
 */

import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const COST_CONFIGS = {
  development: {
    maxCostPerMatch: 0.005,      // $0.005 per match
    maxTotalDailyCost: 0.50,     // $0.50 per day
    preferCheaperModels: true,   // Always use cheapest viable model
    qualityThreshold: 0.6,       // Lower quality threshold for dev
    allowedModels: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k']
  },
  staging: {
    maxCostPerMatch: 0.01,       // $0.01 per match
    maxTotalDailyCost: 1.00,     // $1.00 per day
    preferCheaperModels: true,   // Prefer cheaper models
    qualityThreshold: 0.7,       // Medium quality threshold
    allowedModels: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4-turbo']
  },
  production: {
    maxCostPerMatch: 0.02,       // $0.02 per match
    maxTotalDailyCost: 5.00,     // $5.00 per day
    preferCheaperModels: false,  // Balance quality and cost
    qualityThreshold: 0.8,       // High quality threshold
    allowedModels: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4-turbo', 'gpt-4']
  }
};

function setCostLimits(environment = 'development') {
  console.log(`💰 Setting AI Cost Limits for ${environment.toUpperCase()} environment\n`);

  const config = COST_CONFIGS[environment];
  if (!config) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.log('Available environments:', Object.keys(COST_CONFIGS).join(', '));
    return;
  }

  // Create environment variables
  const envVars = {
    // Cost limits
    [`AI_MAX_COST_PER_MATCH_${environment.toUpperCase()}`]: config.maxCostPerMatch.toString(),
    [`AI_MAX_DAILY_COST_${environment.toUpperCase()}`]: config.maxTotalDailyCost.toString(),
    [`AI_PREFER_CHEAPER_MODELS_${environment.toUpperCase()}`]: config.preferCheaperModels.toString(),
    [`AI_QUALITY_THRESHOLD_${environment.toUpperCase()}`]: config.qualityThreshold.toString(),
    [`AI_ALLOWED_MODELS_${environment.toUpperCase()}`]: config.allowedModels.join(','),
    
    // Global cost settings
    'AI_COST_OPTIMIZATION_ENABLED': 'true',
    'AI_COST_MONITORING_ENABLED': 'true',
    'AI_AUTO_FALLBACK_ENABLED': 'true'
  };

  console.log('📝 Setting environment variables:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`   ${key}=${value}`);
  });

  // Update .env.local file
  const envPath = '.env.local';
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('   Creating new .env.local file');
  }

  // Add or update cost-related variables
  Object.entries(envVars).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      // Update existing variable
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new variable
      envContent += `\n${key}=${value}`;
    }
  });

  // Write back to file
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`\n✅ Cost limits saved to ${envPath}`);

  // Show current configuration
  console.log('\n📊 Current Cost Configuration:');
  console.log('================================');
  console.log(`💰 Max Cost per Match: $${config.maxCostPerMatch}`);
  console.log(`📅 Max Daily Cost: $${config.maxTotalDailyCost}`);
  console.log(`🎯 Quality Threshold: ${(config.qualityThreshold * 100).toFixed(0)}%`);
  console.log(`🧠 Preferred Models: ${config.preferCheaperModels ? 'Cheaper' : 'Balanced'}`);
  console.log(`🚀 Allowed Models: ${config.allowedModels.join(', ')}`);

  // Show cost comparison
  console.log('\n💡 Cost Comparison (per 1K tokens):');
  console.log('=====================================');
  console.log('GPT-4:        $0.09 (highest quality, highest cost)');
  console.log('GPT-4-turbo:  $0.04 (high quality, medium cost)');
  console.log('GPT-3.5-16k:  $0.007 (good quality, low cost)');
  console.log('GPT-3.5:      $0.0035 (good quality, lowest cost)');

  console.log('\n🎯 Recommendations:');
  if (environment === 'development') {
    console.log('   → Use GPT-3.5 models for 90% cost reduction');
    console.log('   → Focus on functionality over quality');
  } else if (environment === 'staging') {
    console.log('   → Balance cost and quality');
    console.log('   → Use GPT-4 only when necessary');
  } else {
    console.log('   → Optimize for user experience');
    console.log('   → Monitor costs closely');
  }
}

// Get environment from command line or default to development
const environment = process.argv[2] || 'development';
setCostLimits(environment);
