#!/usr/bin/env node

/**
 * Provenance Metrics Dashboard
 * 
 * This script displays analytics on AI matching performance,
 * costs, fallback rates, and other provenance data.
 * 
 * Run with: node scripts/provenance-metrics.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

async function displayProvenanceMetrics() {
  console.log('📊 Provenance Tracking Metrics Dashboard\n');

  // Check required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Check if provenance columns exist by trying to query them
    try {
      const { data: testQuery, error: testError } = await supabase
        .from('matches')
        .select('match_algorithm, ai_model, prompt_version')
        .limit(1);

      if (testError && testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.log('⚠️  Provenance tracking columns not found.');
        console.log('   Run the migration first: node scripts/apply-provenance-migration.js');
        return;
      }
    } catch (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('⚠️  Provenance tracking columns not found.');
        console.log('   Run the migration first: node scripts/apply-provenance-migration.js');
        return;
      }
    }

    console.log('✅ Provenance tracking is enabled\n');

    // Get total matches count
    const { count: totalMatches, error: countError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to get matches count: ${countError.message}`);
    }

    console.log(`📈 Total Matches: ${totalMatches || 0}\n`);

    // Algorithm distribution
    console.log('🤖 Match Algorithm Distribution:');
    const { data: algorithmStats, error: algoError } = await supabase
      .from('matches')
      .select('match_algorithm')
      .not('match_algorithm', 'is', null);

    if (!algoError && algorithmStats) {
      const algoCounts = algorithmStats.reduce((acc, match) => {
        const algo = match.match_algorithm || 'unknown';
        acc[algo] = (acc[algo] || 0) + 1;
        return acc;
      }, {});

      Object.entries(algoCounts).forEach(([algo, count]) => {
        const percentage = ((count / algorithmStats.length) * 100).toFixed(1);
        console.log(`   ${algo}: ${count} (${percentage}%)`);
      });
    }

    // AI Model usage
    console.log('\n🧠 AI Model Usage:');
    const { data: modelStats, error: modelError } = await supabase
      .from('matches')
      .select('ai_model')
      .not('ai_model', 'is', null);

    if (!modelError && modelStats) {
      const modelCounts = modelStats.reduce((acc, match) => {
        const model = match.ai_model || 'unknown';
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {});

      Object.entries(modelCounts).forEach(([model, count]) => {
        const percentage = ((count / modelStats.length) * 100).toFixed(1);
        console.log(`   ${model}: ${count} (${percentage}%)`);
      });
    }

    // Cache hit rate
    console.log('\n💾 Cache Performance:');
    const { data: cacheStats, error: cacheError } = await supabase
      .from('matches')
      .select('cache_hit')
      .not('cache_hit', 'is', null);

    if (!cacheError && cacheStats) {
      const cacheHits = cacheStats.filter(match => match.cache_hit).length;
      const cacheMisses = cacheStats.length - cacheHits;
      const hitRate = ((cacheHits / cacheStats.length) * 100).toFixed(1);
      
      console.log(`   Cache Hits: ${cacheHits} (${hitRate}%)`);
      console.log(`   Cache Misses: ${cacheMisses} (${100 - parseFloat(hitRate)}%)`);
    }

    // Fallback reasons
    console.log('\n🔄 Fallback Analysis:');
    const { data: fallbackStats, error: fallbackError } = await supabase
      .from('matches')
      .select('fallback_reason')
      .not('fallback_reason', 'is', null);

    if (!fallbackError && fallbackStats) {
      const fallbackCounts = fallbackStats.reduce((acc, match) => {
        const reason = match.fallback_reason || 'unknown';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});

      Object.entries(fallbackCounts).forEach(([reason, count]) => {
        const percentage = ((count / fallbackStats.length) * 100).toFixed(1);
        console.log(`   ${reason}: ${count} (${percentage}%)`);
      });
    }

    // Performance metrics
    console.log('\n⚡ Performance Metrics:');
    const { data: latencyStats, error: latencyError } = await supabase
      .from('matches')
      .select('ai_latency_ms')
      .not('ai_latency_ms', 'is', null)
      .gt('ai_latency_ms', 0);

    if (!latencyError && latencyStats && latencyStats.length > 0) {
      const latencies = latencyStats.map(match => match.ai_latency_ms);
      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);
      
      console.log(`   Average AI Latency: ${avgLatency.toFixed(0)}ms`);
      console.log(`   Min AI Latency: ${minLatency}ms`);
      console.log(`   Max AI Latency: ${maxLatency}ms`);
    }

    // Cost analysis
    console.log('\n💰 Cost Analysis:');
    const { data: costStats, error: costError } = await supabase
      .from('matches')
      .select('ai_cost_usd')
      .not('ai_cost_usd', 'is', null)
      .gt('ai_cost_usd', 0);

    if (!costError && costStats && costStats.length > 0) {
      const costs = costStats.map(match => match.ai_cost_usd);
      const totalCost = costs.reduce((sum, cost) => sum + parseFloat(cost), 0);
      const avgCost = totalCost / costs.length;
      const maxCost = Math.max(...costs);
      
      console.log(`   Total AI Cost: $${totalCost.toFixed(5)}`);
      console.log(`   Average Cost per Match: $${avgCost.toFixed(5)}`);
      console.log(`   Highest Cost Match: $${maxCost.toFixed(5)}`);
    }

    // Recent activity
    console.log('\n🕒 Recent Activity (Last 24 hours):');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentMatches, error: recentError } = await supabase
      .from('matches')
      .select('created_at, match_algorithm, ai_model, ai_latency_ms')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentError && recentMatches) {
      recentMatches.forEach(match => {
        const time = new Date(match.created_at).toLocaleTimeString();
        const algo = match.match_algorithm || 'unknown';
        const model = match.ai_model || 'N/A';
        const latency = match.ai_latency_ms || 0;
        
        console.log(`   ${time} | ${algo} | ${model} | ${latency}ms`);
      });
    }

    console.log('\n🎯 Provenance tracking is working!');
    console.log('💡 Use this data to optimize your AI matching strategy.');

  } catch (error) {
    console.error('\n❌ Failed to fetch metrics:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. The migration has been applied');
    console.error('   2. Your service role has read access to matches table');
    console.error('   3. There are matches in the database');
  }
}

// Run the metrics display
if (require.main === module) {
  displayProvenanceMetrics()
    .then(() => {
      console.log('\n✨ Metrics display completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Metrics display failed:', error);
      process.exit(1);
    });
}

module.exports = { displayProvenanceMetrics };
