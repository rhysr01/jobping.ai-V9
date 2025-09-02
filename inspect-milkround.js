/**
 * Script to inspect Milkround job structure
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const testUrl = 'https://www.milkround.com/jobs/graduate';

async function inspectMilkroundJobs() {
  try {
    console.log(`🔍 Inspecting Milkround job structure for: ${testUrl}`);
    
    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log(`📄 HTML size: ${html.length} chars`);
    console.log(`📄 Title: ${$('title').text()}`);
    
    // Look for the job-results-row element
    const jobResultsRow = $('.job-results-row');
    console.log(`\n🔍 Found ${jobResultsRow.length} .job-results-row elements`);
    
    if (jobResultsRow.length > 0) {
      const firstRow = jobResultsRow.first();
      console.log(`\n📋 First .job-results-row content:`);
      console.log(`   Text: "${firstRow.text().trim().slice(0, 200)}..."`);
      console.log(`   HTML: "${firstRow.html().slice(0, 500)}..."`);
      
      // Look for links within this element
      const links = firstRow.find('a');
      console.log(`\n🔗 Found ${links.length} links within .job-results-row`);
      
      links.slice(0, 10).each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        console.log(`   ${i + 1}. ${href} - "${text}"`);
      });
    }
    
    // Look for any elements that might contain job listings
    console.log(`\n🔍 Looking for job listing containers:`);
    
    const possibleJobContainers = [
      '.job-results-row',
      '.results-container',
      '[class*="job"]',
      '[class*="result"]',
      '[class*="listing"]',
      '[class*="card"]'
    ];
    
    possibleJobContainers.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`   ${selector}: ${elements.length} elements`);
        
        // Show first element's content
        const first = elements.first();
        const text = first.text().trim().slice(0, 100);
        console.log(`     Sample: "${text}..."`);
      }
    });
    
    // Look for actual job links
    console.log(`\n🔗 Looking for job links:`);
    const jobLinks = $('a[href*="/jobs/"]');
    console.log(`   Found ${jobLinks.length} job links`);
    
    // Look for actual job listing URLs (not filter URLs)
    const actualJobLinks = jobLinks.filter((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      // Filter out salary filter links and look for actual job listings
      return href && !href.includes('salary=') && !href.includes('action=') && text.length > 5;
    });
    
    console.log(`   Found ${actualJobLinks.length} actual job listing links`);
    
    actualJobLinks.slice(0, 10).each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      console.log(`   ${i + 1}. ${href} - "${text}"`);
    });
    
  } catch (error) {
    console.error('❌ Error inspecting Milkround:', error.message);
  }
}

inspectMilkroundJobs();
