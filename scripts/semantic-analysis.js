#!/usr/bin/env node

/**
 * Semantic Analysis Dashboard
 * Run with: node scripts/semantic-analysis.js
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

async function analyzeSemanticCapabilities() {
  console.log('🧠 AI Semantic Capabilities Analysis\n');

  try {
    // Get recent matches to analyze
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        jobs!inner(
          title,
          company,
          description,
          location,
          experience_required
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    if (!matches || matches.length === 0) {
      console.log('📊 No matches found to analyze');
      return;
    }

    console.log('📊 Current AI Matching Analysis');
    console.log('================================');

    // Analyze matching patterns
    const aiMatches = matches.filter(m => m.match_algorithm === 'ai');
    const rulesMatches = matches.filter(m => m.match_algorithm === 'rules');

    console.log(`🤖 AI Matches: ${aiMatches.length} (${((aiMatches.length / matches.length) * 100).toFixed(1)}%)`);
    console.log(`📋 Rules Matches: ${rulesMatches.length} (${((rulesMatches.length / matches.length) * 100).toFixed(1)}%)`);

    // Analyze match quality distribution
    const qualityDistribution = {};
    aiMatches.forEach(match => {
      const quality = match.match_quality || 'unknown';
      qualityDistribution[quality] = (qualityDistribution[quality] || 0) + 1;
    });

    console.log('\n🎯 AI Match Quality Distribution:');
    Object.entries(qualityDistribution).forEach(([quality, count]) => {
      const percentage = ((count / aiMatches.length) * 100).toFixed(1);
      console.log(`   ${quality}: ${count} (${percentage}%)`);
    });

    // Analyze match reasons for semantic understanding
    console.log('\n🔍 Match Reason Analysis (Semantic Understanding):');
    const reasonAnalysis = {};
    aiMatches.forEach(match => {
      const reason = match.match_reason || 'No reason provided';
      
      // Categorize reasons by semantic depth
      if (reason.includes('career') || reason.includes('skill') || reason.includes('experience')) {
        reasonAnalysis['Semantic Understanding'] = (reasonAnalysis['Semantic Understanding'] || 0) + 1;
      } else if (reason.includes('location') || reason.includes('company')) {
        reasonAnalysis['Basic Matching'] = (reasonAnalysis['Basic Matching'] || 0) + 1;
      } else {
        reasonAnalysis['Generic'] = (reasonAnalysis['Generic'] || 0) + 1;
      }
    });

    Object.entries(reasonAnalysis).forEach(([category, count]) => {
      const percentage = ((count / aiMatches.length) * 100).toFixed(1);
      console.log(`   ${category}: ${count} (${percentage}%)`);
    });

    // Sample match analysis
    if (aiMatches.length > 0) {
      console.log('\n📝 Sample AI Match Analysis:');
      const sampleMatch = aiMatches[0];
      console.log(`   Job: ${sampleMatch.jobs?.title} at ${sampleMatch.jobs?.company}`);
      console.log(`   Score: ${sampleMatch.match_score}`);
      console.log(`   Quality: ${sampleMatch.match_quality}`);
      console.log(`   Reason: ${sampleMatch.match_reason}`);
      
      // Analyze the semantic depth of the reason
      const reason = sampleMatch.match_reason || '';
      const semanticDepth = analyzeSemanticDepth(reason);
      console.log(`   Semantic Depth: ${semanticDepth.level} (${semanticDepth.score}/10)`);
      console.log(`   Analysis: ${semanticDepth.explanation}`);
    }

    // Semantic improvement recommendations
    console.log('\n💡 Semantic AI Improvement Recommendations');
    console.log('==========================================');

    const semanticScore = calculateOverallSemanticScore(aiMatches);
    console.log(`📊 Current Semantic Score: ${semanticScore}/10`);

    if (semanticScore < 5) {
      console.log('⚠️  Low semantic understanding detected');
      console.log('   → Implement semantic embeddings for job-user matching');
      console.log('   → Use AI to extract skills and career progression');
      console.log('   → Add context-aware matching beyond keywords');
    } else if (semanticScore < 7) {
      console.log('🔄 Moderate semantic understanding');
      console.log('   → Enhance skill extraction from job descriptions');
      console.log('   → Add industry and company culture understanding');
      console.log('   → Implement career progression matching');
    } else {
      console.log('✅ Good semantic understanding');
      console.log('   → Fine-tune existing semantic capabilities');
      console.log('   → Add advanced features like cultural fit scoring');
      console.log('   → Implement continuous learning from user feedback');
    }

    // Specific improvements
    console.log('\n🎯 Specific Improvements Needed:');
    
    if (aiMatches.filter(m => m.match_reason?.includes('career')).length < aiMatches.length * 0.3) {
      console.log('   → Add career path understanding');
      console.log('   → Implement skill transferability analysis');
    }
    
    if (aiMatches.filter(m => m.match_reason?.includes('skill')).length < aiMatches.length * 0.4) {
      console.log('   → Enhance skill extraction and matching');
      console.log('   → Add soft skills recognition');
    }
    
    if (aiMatches.filter(m => m.match_reason?.includes('culture')).length < aiMatches.length * 0.1) {
      console.log('   → Add cultural fit analysis');
      console.log('   → Implement company culture understanding');
    }

    // Implementation roadmap
    console.log('\n🚀 Implementation Roadmap:');
    console.log('1. Add semantic embeddings (text-embedding-3-small)');
    console.log('2. Implement skill extraction from job descriptions');
    console.log('3. Add career progression understanding');
    console.log('4. Implement cultural fit scoring');
    console.log('5. Add continuous learning from user feedback');

  } catch (error) {
    console.error('❌ Failed to analyze semantic capabilities:', error.message);
  }
}

/**
 * Analyze the semantic depth of a match reason
 */
function analyzeSemanticDepth(reason) {
  if (!reason) {
    return { level: 'None', score: 0, explanation: 'No reason provided' };
  }

  let score = 0;
  const explanations = [];

  // Check for semantic understanding indicators
  if (reason.includes('career') || reason.includes('progression')) {
    score += 2;
    explanations.push('Career progression understanding');
  }
  
  if (reason.includes('skill') || reason.includes('expertise')) {
    score += 2;
    explanations.push('Skill-based matching');
  }
  
  if (reason.includes('experience') || reason.includes('level')) {
    score += 1;
    explanations.push('Experience level awareness');
  }
  
  if (reason.includes('industry') || reason.includes('sector')) {
    score += 1;
    explanations.push('Industry awareness');
  }
  
  if (reason.includes('culture') || reason.includes('fit')) {
    score += 2;
    explanations.push('Cultural fit understanding');
  }
  
  if (reason.includes('location') || reason.includes('remote')) {
    score += 1;
    explanations.push('Location preference understanding');
  }

  // Check for generic responses
  if (reason.includes('match') && reason.length < 20) {
    score -= 1;
    explanations.push('Generic response detected');
  }

  // Determine level
  let level = 'Basic';
  if (score >= 7) level = 'Advanced';
  else if (score >= 4) level = 'Intermediate';
  else if (score >= 1) level = 'Basic';
  else level = 'None';

  return {
    level,
    score: Math.max(0, Math.min(10, score)),
    explanation: explanations.join(', ') || 'Limited semantic understanding'
  };
}

/**
 * Calculate overall semantic score for AI matches
 */
function calculateOverallSemanticScore(aiMatches) {
  if (aiMatches.length === 0) return 0;
  
  const totalScore = aiMatches.reduce((sum, match) => {
    const reason = match.match_reason || '';
    const depth = analyzeSemanticDepth(reason);
    return sum + depth.score;
  }, 0);
  
  return Math.round((totalScore / aiMatches.length) * 10) / 10;
}

// Run the semantic analysis
analyzeSemanticCapabilities().catch(console.error);
