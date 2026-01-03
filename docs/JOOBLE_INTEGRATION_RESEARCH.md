# Jooble API Integration Research

**Date**: January 3, 2026  
**Status**: 📋 Research Complete - Ready for Implementation Decision

---

## Overview

Jooble is a job search aggregator that operates in multiple countries. This document outlines research findings for potential integration into the JobPing scraping system.

---

## API Information

### Availability
- **API Type**: REST API
- **Documentation**: Available at [Jooble API Documentation](https://jooble.org/api/about)
- **Access**: Requires API key registration

### Supported Countries
Jooble operates in **71 countries** including:
- **Europe**: UK, Ireland, Germany, France, Spain, Italy, Netherlands, Poland, Czech Republic, Sweden, Denmark, Austria, Switzerland, and more
- **North America**: USA, Canada
- **Other regions**: Australia, New Zealand, and many others

### Coverage for Target Cities
Based on JobPing's 20 target cities:
- ✅ **Supported**: Most European cities (London, Paris, Berlin, Madrid, Amsterdam, etc.)
- ✅ **Potentially Supported**: Stockholm (SE), Copenhagen (DK), Prague (CZ), Dublin (IE) - these are NOT supported by Adzuna
- ⚠️ **Need Verification**: Vienna (AT), Warsaw (PL)

---

## API Features

### Search Capabilities
- **Location-based search**: City and country parameters
- **Keyword search**: Job title, description keywords
- **Filtering**: Job type, salary range, date posted
- **Pagination**: Multiple pages of results
- **Language support**: Multiple languages per country

### Rate Limits
- **Free Tier**: Limited requests per day (exact limits need API key registration to verify)
- **Paid Tiers**: Higher limits available
- **Recommendation**: Contact Jooble for exact rate limits before implementation

### Response Format
- **JSON format**: Standard REST API response
- **Job fields**: Title, company, location, description, salary, posted date, URL
- **Metadata**: Total results, pagination info

---

## Integration Considerations

### Advantages
1. **Geographic Coverage**: Covers cities not supported by Adzuna (IE, SE, DK, CZ)
2. **Diverse Sources**: Aggregates from multiple job boards
3. **Early-Career Jobs**: Likely has internship and graduate positions
4. **Free Tier Available**: Can start with free tier to test

### Challenges
1. **Rate Limits**: Need to verify free tier limits
2. **API Key Required**: Need to register and obtain API key
3. **Data Quality**: Need to validate job quality matches JobPing standards
4. **Early-Career Filtering**: May need additional filtering logic

---

## Implementation Plan (If Approved)

### Phase 1: Setup
1. Register for Jooble API key
2. Add `JOOBLE_API_KEY` to `.env.local`
3. Test API with sample queries for target cities

### Phase 2: Scraper Development
1. Create `scrapers/jooble-wrapper.cjs` (similar to `adzuna-wrapper.cjs`)
2. Implement city filtering (only supported cities)
3. Add early-career job filtering
4. Integrate with existing job processor pipeline

### Phase 3: Integration
1. Add to `automation/real-job-runner.cjs`
2. Configure rate limits and pagination
3. Add error handling and logging
4. Test with production data

### Phase 4: Monitoring
1. Track job volume per city
2. Monitor API rate limit usage
3. Validate job quality
4. Compare performance vs other scrapers

---

## Recommended Next Steps

1. **Register for API Key**: Visit [Jooble API Registration](https://jooble.org/api/about) to get API key
2. **Test API**: Run sample queries for target cities (especially Dublin, Stockholm, Copenhagen, Prague)
3. **Evaluate Results**: Check job quality, early-career coverage, and rate limits
4. **Decision**: Based on test results, decide whether to proceed with full integration

---

## Alternative: Manual Testing First

Before full integration, consider:
1. **Manual API Testing**: Use Postman or curl to test API responses
2. **Sample Data Collection**: Collect 100-200 sample jobs to evaluate quality
3. **Coverage Analysis**: Check which cities have good early-career job coverage
4. **Cost-Benefit**: Evaluate if Jooble adds value beyond existing scrapers

---

## Current Status

- ✅ Research complete
- ⏳ Awaiting API key registration
- ⏳ Awaiting test results
- ⏳ Awaiting implementation decision

---

## Notes

- Jooble could fill gaps left by Adzuna (IE, SE, DK, CZ cities)
- Should complement existing scrapers, not replace them
- Need to ensure early-career filtering is effective
- Consider rate limits when designing scraper frequency

