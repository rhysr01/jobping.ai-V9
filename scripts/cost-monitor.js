#!/usr/bin/env node

/**
 * AI Cost Monitoring Dashboard
 * Run with: node scripts/cost-monitor.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function monitorCosts() {
  console.log('💰 AI Cost Monitoring Dashboard\n');

  try {
    // Get cost data from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: matches, error } = await supabase
      .from('matches')
      .select('ai_cost_usd, ai_model, match_algorithm, created_at, ai_latency_ms')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!matches || matches.length === 0) {
      console.log('📊 No matches found in the last 7 days');
      return;
    }

    // Calculate cost metrics
    const totalCost = matches.reduce((sum, match) => sum + (match.ai_cost_usd || 0), 0);
    const aiMatches = matches.filter(m => m.match_algorithm === 'ai');
    const rulesMatches = matches.filter(m => m.match_algorithm === 'rules');
    
    // Cost by model
    const costByModel = {};
    aiMatches.forEach(match => {
      const model = match.ai_model || 'unknown';
      costByModel[model] = (costByModel[model] || 0) + (match.ai_cost_usd || 0);
    });

    // Daily cost breakdown
    const dailyCosts = {};
    matches.forEach(match => {
      const date = new Date(match.created_at).toDateString();
      dailyCosts[date] = (dailyCosts[date] || 0) + (match.ai_cost_usd || 0);
    });

    // Performance vs cost analysis
    const avgLatency = aiMatches.reduce((sum, m) => sum + (m.ai_latency_ms || 0), 0) / aiMatches.length;
    const avgCostPerMatch = aiMatches.length > 0 ? totalCost / aiMatches.length : 0;

    console.log('📊 Cost Overview (Last 7 Days)');
    console.log('================================');
    console.log(`💰 Total AI Cost: $${totalCost.toFixed(4)}`);
    console.log(`📈 Total Matches: ${matches.length}`);
    console.log(`🤖 AI Matches: ${aiMatches.length} (${((aiMatches.length / matches.length) * 100).toFixed(1)}%)`);
    console.log(`📋 Rules Matches: ${rulesMatches.length} (${((rulesMatches.length / matches.length) * 100).toFixed(1)}%)`);
    console.log(`⚡ Average AI Latency: ${avgLatency.toFixed(0)}ms`);
    console.log(`💵 Average Cost per AI Match: $${avgCostPerMatch.toFixed(4)}\n`);

    console.log('🧠 Cost by AI Model');
    console.log('===================');
    Object.entries(costByModel)
      .sort(([,a], [,b]) => b - a)
      .forEach(([model, cost]) => {
        const percentage = ((cost / totalCost) * 100).toFixed(1);
        console.log(`${model}: $${cost.toFixed(4)} (${percentage}%)`);
      });
    console.log();

    console.log('📅 Daily Cost Breakdown');
    console.log('========================');
    Object.entries(dailyCosts)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .forEach(([date, cost]) => {
        console.log(`${date}: $${cost.toFixed(4)}`);
      });
    console.log();

    // Cost optimization recommendations
    console.log('💡 Cost Optimization Recommendations');
    console.log('===================================');
    
    if (avgCostPerMatch > 0.01) {
      console.log('⚠️  High cost per match detected');
      console.log('   → Consider using GPT-3.5-turbo for simple matching');
      console.log('   → Implement better caching to reduce API calls');
    }

    if (aiMatches.length > rulesMatches.length * 2) {
      console.log('⚠️  High AI usage detected');
      console.log('   → Consider rules-based fallback for simple cases');
      console.log('   → Implement user tier-based AI access');
    }

    if (totalCost > 5.00) {
      console.log('⚠️  High weekly costs detected');
      console.log('   → Set daily cost limits');
      console.log('   → Implement cost-aware model selection');
    }

    // Model-specific recommendations
    if (costByModel['gpt-4'] && costByModel['gpt-4'] > totalCost * 0.5) {
      console.log('⚠️  GPT-4 is driving most costs');
      console.log('   → Use GPT-4 only for complex matching');
      console.log('   → Consider GPT-4-turbo for better cost/performance');
    }

    if (!costByModel['gpt-3.5-turbo'] && !costByModel['gpt-3.5-turbo-16k']) {
      console.log('💡 Cost reduction opportunity');
      console.log('   → Consider using GPT-3.5 models for simple cases');
      console.log('   → Can reduce costs by 80-90% for basic matching');
    }

    // Performance recommendations
    if (avgLatency > 2000) {
      console.log('⚠️  High latency detected');
      console.log('   → Consider using faster models (GPT-3.5-turbo)');
      console.log('   → Implement request batching');
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. Implement cost-aware model selection');
    console.log('2. Set daily cost limits');
    console.log('3. Improve caching strategy');
    console.log('4. Use rules-based fallback for simple cases');

  } catch (error) {
    console.error('❌ Failed to monitor costs:', error.message);
  }
}

// Run the cost monitor
monitorCosts().catch(console.error);
