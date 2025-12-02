# Reed Scraper - UK Only Fix

## Issue
Reed.co.uk is a UK-only job board, but the scraper was accepting all cities from `TARGET_CITIES` environment variable, which includes 20 European cities.

## Fix Applied
Updated `scrapers/reed-scraper-standalone.cjs` to:
1. **Define UK cities only**: `['London', 'Manchester', 'Birmingham', 'Belfast', 'Dublin']`
2. **Filter TARGET_CITIES**: Only use cities that are in the UK list
3. **Log filtered cities**: Warn when non-UK cities are filtered out

## Code Changes

```javascript
// Reed.co.uk is UK-only (plus Dublin, Ireland)
const UK_CITIES = ['London', 'Manchester', 'Birmingham', 'Belfast', 'Dublin'];
const DEFAULT_LOCATIONS = ['London', 'Manchester', 'Birmingham', 'Belfast', 'Dublin'];

// Filter TARGET_CITIES to only UK cities (Reed is UK-only)
function filterUKCities(cities) {
  return cities.filter(city => UK_CITIES.includes(city));
}

const TARGET_CITIES = parseTargetCities();
const UK_TARGET_CITIES = TARGET_CITIES.length ? filterUKCities(TARGET_CITIES) : [];
const LOCATIONS = UK_TARGET_CITIES.length ? UK_TARGET_CITIES : DEFAULT_LOCATIONS;
```

## Behavior

### Before Fix
- Would attempt to scrape all cities from `TARGET_CITIES` (20 cities)
- Would fail or return no results for non-UK cities
- Wasted API calls on unsupported cities

### After Fix
- Only scrapes UK cities: London, Manchester, Birmingham, Belfast, Dublin
- Filters out non-UK cities automatically
- Logs which cities were filtered
- Falls back to UK defaults if no UK cities in TARGET_CITIES

## Example Output

```
⚠️  Reed: Filtered out 15 non-UK cities: Paris, Milan, Berlin, Madrid, Barcelona, Amsterdam, Munich, Hamburg, Zurich, Rome, Brussels, Stockholm, Copenhagen, Vienna, Prague, Warsaw
✅ Reed: Using UK cities only: London, Manchester, Birmingham, Belfast, Dublin
```

## Impact

- ✅ **Efficiency**: No wasted API calls on unsupported cities
- ✅ **Accuracy**: Only scrapes cities Reed actually supports
- ✅ **Performance**: Faster scraping (fewer cities to process)
- ✅ **Reliability**: No errors from trying unsupported cities

---

**Status**: ✅ **FIXED** - Reed now only scrapes UK cities

