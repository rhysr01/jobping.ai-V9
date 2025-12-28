# Data Integrity Fix for Dashboard Views

**Date**: 2025-01-29  
**Issue**: Dashboard views expect `ai_model` and `ai_cost_usd` fields, but matches aren't being saved with these values

---

## Problem

The dashboard views (`ai_matching_quality_report` and `daily_system_health`) expect these fields on the `matches` table:

- ✅ `match_algorithm` - Being set (as 'ai' or 'rules')
- ✅ `fallback_reason` - Being set  
- ✅ `ai_latency_ms` - Being set
- ✅ `cache_hit` - Being set
- ❌ `ai_model` - **NOT being set** (should be 'gpt-4o-mini')
- ❌ `ai_cost_usd` - **NOT being set** (should be calculated from OpenAI usage)

---

## Current State

### Where Matches Are Saved

**File**: `app/api/match-users/route.ts` (lines 1124-1139)

```typescript
const matchEntries = matchesWithEmail
  .filter(m => m.job_hash)
  .map(match => ({
    user_email: match.user_email,
    job_hash: match.job_hash,
    match_score: ...,
    match_reason: match.match_reason || 'AI match',
    matched_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    match_algorithm: finalProvenance.match_algorithm || 'ai',
    ai_latency_ms: finalProvenance.ai_latency_ms || null,
    cache_hit: finalProvenance.cache_hit || false,
    fallback_reason: finalProvenance.fallback_reason || null,
    // ❌ MISSING: ai_model
    // ❌ MISSING: ai_cost_usd
  }));
```

### What ConsolidatedMatchingEngine Returns

**File**: `Utils/consolidatedMatchingV2.ts`

```typescript
interface ConsolidatedMatchResult {
  matches: JobMatch[];
  method: 'ai_success' | 'ai_timeout' | 'ai_failed' | 'rule_based';
  processingTime: number;
  confidence: number;
  // ❌ MISSING: aiModel
  // ❌ MISSING: aiCostUsd
}
```

The engine tracks costs internally (`this.costTracker`) but doesn't return them.

---

## Solution

### Step 1: Extend ConsolidatedMatchResult Interface

Add fields to return AI metadata:

```typescript
interface ConsolidatedMatchResult {
  matches: JobMatch[];
  method: 'ai_success' | 'ai_timeout' | 'ai_failed' | 'rule_based';
  processingTime: number;
  confidence: number;
  aiModel?: string;        // NEW: e.g., 'gpt-4o-mini'
  aiCostUsd?: number;      // NEW: calculated cost
  aiTokensUsed?: number;   // NEW: tokens consumed
}
```

### Step 2: Update ConsolidatedMatchingEngine to Return AI Metadata

When AI matching succeeds, capture and return:

```typescript
// In performMatching() when AI succeeds:
return {
  matches: validatedMatches,
  method: 'ai_success',
  processingTime: Date.now() - startTime,
  confidence: 0.9,
  aiModel: 'gpt-4o-mini',           // NEW
  aiCostUsd: this.calculateCost(),  // NEW: from costTracker
  aiTokensUsed: this.getTokenCount() // NEW: from costTracker
};

// When fallback to rules:
return {
  matches: ruleMatches,
  method: 'ai_failed',
  processingTime: Date.now() - startTime,
  confidence: 0.7,
  aiModel: null,            // NEW: no AI used
  aiCostUsd: 0,             // NEW: no cost
  aiTokensUsed: 0           // NEW: no tokens
};
```

### Step 3: Update match-users/route.ts to Save AI Metadata

```typescript
// Prepare provenance data with actual timing and match type
const finalProvenance = {
  match_algorithm: matchType === 'ai_success' ? 'ai' : 'rules',
  ai_latency_ms: aiMatchingTime,
  cache_hit: userProvenance.cache_hit || false,
  fallback_reason: matchType !== 'ai_success' ? 'ai_failed_or_fallback' : undefined,
  ai_model: result.aiModel || null,           // NEW
  ai_cost_usd: result.aiCostUsd || null,      // NEW
  ai_tokens_used: result.aiTokensUsed || null // NEW (optional)
};

// In matchEntries.map():
matchEntries = matchesWithEmail.map(match => ({
  user_email: match.user_email,
  job_hash: match.job_hash,
  match_score: ...,
  match_reason: match.match_reason || 'AI match',
  matched_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  match_algorithm: finalProvenance.match_algorithm || 'ai',
  ai_latency_ms: finalProvenance.ai_latency_ms || null,
  cache_hit: finalProvenance.cache_hit || false,
  fallback_reason: finalProvenance.fallback_reason || null,
  ai_model: finalProvenance.ai_model || null,           // NEW
  ai_cost_usd: finalProvenance.ai_cost_usd || null,     // NEW
}));
```

---

## Cost Calculation

### GPT-4o-mini Pricing (as of 2025)

- **Input**: $0.15 per 1M tokens
- **Output**: $0.60 per 1M tokens

```typescript
// In ConsolidatedMatchingEngine
private calculateAICost(tokensUsed: number, model: string): number {
  if (model === 'gpt-4o-mini') {
    // Estimate: 80% input, 20% output (typical for function calling)
    const inputTokens = tokensUsed * 0.8;
    const outputTokens = tokensUsed * 0.2;
    const inputCost = (inputTokens / 1_000_000) * 0.15;
    const outputCost = (outputTokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }
  return 0;
}
```

---

## Testing

After implementing, verify:

1. **AI matches have ai_model set**:
   ```sql
   SELECT ai_model, COUNT(*) 
   FROM matches 
   WHERE match_algorithm = 'ai' 
   GROUP BY ai_model;
   ```
   Should show: `gpt-4o-mini | N`

2. **AI matches have ai_cost_usd set**:
   ```sql
   SELECT 
     COUNT(*) as total,
     COUNT(ai_cost_usd) as with_cost,
     AVG(ai_cost_usd) as avg_cost
   FROM matches 
   WHERE match_algorithm = 'ai';
   ```
   Should show: `with_cost > 0` and `avg_cost > 0`

3. **Dashboard view returns data**:
   ```sql
   SELECT * FROM ai_matching_quality_report LIMIT 5;
   ```
   Should show: `models_used = 1`, `total_cost_usd > 0`

---

## Priority

🟢 **High** - Dashboard views will show incomplete data without this fix.

---

## Files to Modify

1. `Utils/consolidatedMatchingV2.ts` - Extend interface, return AI metadata
2. `app/api/match-users/route.ts` - Save ai_model and ai_cost_usd to database
3. `app/api/signup/free/route.ts` - Same fix if it saves matches
4. `app/api/signup/route.ts` - Same fix if it saves matches

