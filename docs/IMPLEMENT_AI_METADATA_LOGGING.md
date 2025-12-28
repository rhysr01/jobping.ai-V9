# Implementation Guide: AI Metadata Logging for Dashboard

**Priority**: 🟢 **High** - Dashboard views need this data to function correctly

---

## Current Problem

The `matches` table is missing `ai_model` and `ai_cost_usd` fields, causing dashboard views to show incomplete data:

- `ai_matching_quality_report` - Can't show model usage or costs
- `daily_system_health` - Can't show AI costs

---

## Required Changes

### 1. Extend ConsolidatedMatchResult Interface

**File**: `Utils/consolidatedMatchingV2.ts`

**Change** (around line 37):

```typescript
interface ConsolidatedMatchResult {
  matches: JobMatch[];
  method: 'ai_success' | 'ai_timeout' | 'ai_failed' | 'rule_based';
  processingTime: number;
  confidence: number;
  // ADD THESE:
  aiModel?: string;        // e.g., 'gpt-4o-mini'
  aiCostUsd?: number;      // Calculated cost
  aiTokensUsed?: number;   // Tokens consumed (optional, for debugging)
}
```

### 2. Track AI Usage in callOpenAIAPI

**File**: `Utils/consolidatedMatchingV2.ts`

**Change** the `callOpenAIAPI` method to return usage data:

```typescript
private async callOpenAIAPI(
  jobs: Job[], 
  userPrefs: UserPreferences, 
  model: 'gpt-4o-mini' | 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-4o-mini'
): Promise<JobMatch[] & { usage?: { total_tokens: number } }> {
  // ... existing code ...
  
  // After completion.usage tracking (around line 640):
  // Store usage for later retrieval
  (result as any).usage = completion.usage;
  
  return result;
}
```

**Better approach**: Return both matches and metadata separately. But simpler fix is to store usage in a class property.

### 3. Calculate and Return AI Metadata

**File**: `Utils/consolidatedMatchingV2.ts`

**Add method** (around line 230):

```typescript
private lastAIUsage: { tokens: number; model: string } | null = null;

// In callOpenAIAPI, store usage:
if (completion.usage) {
  this.lastAIUsage = {
    tokens: completion.usage.total_tokens,
    model: model
  };
  // ... existing cost tracking ...
}

// Add helper method:
private calculateAICost(tokens: number, model: string): number {
  if (model === 'gpt-4o-mini') {
    // Estimate: 80% input, 20% output (typical for function calling)
    const inputTokens = Math.floor(tokens * 0.8);
    const outputTokens = tokens - inputTokens;
    const inputCost = (inputTokens / 1_000_000) * 0.15;
    const outputCost = (outputTokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }
  return 0;
}
```

**Update performMatching** return statements (around lines 432-437 and 447-452):

```typescript
// When AI succeeds:
return {
  matches: validatedMatches,
  method: 'ai_success',
  processingTime: Date.now() - startTime,
  confidence: 0.9,
  aiModel: this.lastAIUsage?.model || 'gpt-4o-mini',
  aiCostUsd: this.lastAIUsage ? this.calculateAICost(this.lastAIUsage.tokens, this.lastAIUsage.model) : undefined,
  aiTokensUsed: this.lastAIUsage?.tokens
};

// When fallback:
return {
  matches: ruleMatches,
  method: 'ai_failed',
  processingTime: Date.now() - startTime,
  confidence: 0.7,
  aiModel: undefined,
  aiCostUsd: 0,
  aiTokensUsed: 0
};
```

### 4. Save AI Metadata to Database

**File**: `app/api/match-users/route.ts`

**Change** (around line 1112-1139):

```typescript
// Prepare provenance data with actual timing and match type
const finalProvenance = {
  match_algorithm: matchType === 'ai_success' ? 'ai' : 'rules',
  ai_latency_ms: aiMatchingTime,
  cache_hit: userProvenance.cache_hit || false,
  fallback_reason: matchType !== 'ai_success' ? 'ai_failed_or_fallback' : undefined,
  // ADD THESE:
  ai_model: result.aiModel || null,
  ai_cost_usd: result.aiCostUsd || null,
};

// In matchEntries.map():
const matchEntries = matchesWithEmail
  .filter(m => m.job_hash)
  .map(match => ({
    user_email: match.user_email,
    job_hash: match.job_hash,
    match_score: typeof match.match_score === 'number' 
      ? (match.match_score > 1 ? match.match_score / 100 : match.match_score)
      : 0.85,
    match_reason: match.match_reason || 'AI match',
    matched_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    match_algorithm: finalProvenance.match_algorithm || 'ai',
    ai_latency_ms: finalProvenance.ai_latency_ms || null,
    cache_hit: finalProvenance.cache_hit || false,
    fallback_reason: finalProvenance.fallback_reason || null,
    // ADD THESE:
    ai_model: finalProvenance.ai_model || null,
    ai_cost_usd: finalProvenance.ai_cost_usd || null,
  }));
```

---

## Alternative: Simpler Fix (Recommended)

Instead of modifying the return type, store AI metadata in a class property and retrieve it when needed:

**File**: `Utils/consolidatedMatchingV2.ts`

```typescript
export class ConsolidatedMatchingEngine {
  // ... existing properties ...
  private lastAIMetadata: { model: string; tokens: number; cost: number } | null = null;

  // In callOpenAIAPI (after line 640):
  if (completion.usage) {
    const tokens = completion.usage.total_tokens || 0;
    const cost = this.calculateAICost(tokens, model);
    this.lastAIMetadata = { model, tokens, cost };
    // ... existing tracking ...
  }

  // In performMatching success return (line 432):
  const aiMetadata = this.lastAIMetadata;
  this.lastAIMetadata = null; // Reset after use
  
  return {
    matches: validatedMatches,
    method: 'ai_success',
    processingTime: Date.now() - startTime,
    confidence: 0.9,
    aiModel: aiMetadata?.model,
    aiCostUsd: aiMetadata?.cost,
    aiTokensUsed: aiMetadata?.tokens
  };
}
```

---

## Testing After Implementation

```sql
-- 1. Verify AI matches have ai_model set
SELECT 
  COUNT(*) as total_ai_matches,
  COUNT(ai_model) as with_model,
  ai_model,
  COUNT(*) as count
FROM matches 
WHERE match_algorithm = 'ai'
GROUP BY ai_model;

-- Expected: Should show 'gpt-4o-mini' with count > 0

-- 2. Verify AI matches have ai_cost_usd set
SELECT 
  COUNT(*) as total,
  COUNT(ai_cost_usd) as with_cost,
  AVG(ai_cost_usd) as avg_cost,
  SUM(ai_cost_usd) as total_cost
FROM matches 
WHERE match_algorithm = 'ai'
AND created_at >= NOW() - INTERVAL '7 days';

-- Expected: with_cost should equal total, avg_cost > 0

-- 3. Verify dashboard view works
SELECT * FROM ai_matching_quality_report LIMIT 5;

-- Expected: Should show models_used = 1, total_cost_usd > 0
```

---

## Files to Modify

1. ✅ `Utils/consolidatedMatchingV2.ts` - Track and return AI metadata
2. ✅ `app/api/match-users/route.ts` - Save ai_model and ai_cost_usd
3. ⚠️ `app/api/signup/free/route.ts` - Check if it saves matches (needs same fix)
4. ⚠️ `app/api/signup/route.ts` - Check if it saves matches (needs same fix)

---

## Cost Calculation Reference

**GPT-4o-mini Pricing** (as of 2025):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- Typical function calling: ~80% input, 20% output

**Example**: 1000 tokens = $0.00015 (input) + $0.00012 (output) = $0.00027

