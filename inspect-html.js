/**
 * Script to inspect HTML structure of job sites
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const testUrl = 'https://www.milkround.com/graduate-jobs';

async function inspectHTML() {
  try {
    console.log(`🔍 Inspecting HTML structure for: ${testUrl}`);
    
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
    
    // Look for common job-related elements
    console.log('\n🔍 Looking for job-related elements:');
    
    // Check for any elements with job-related classes
    const jobClasses = [
      'job', 'position', 'opening', 'career', 'posting', 'listing',
      'card', 'result', 'item', 'offer', 'role', 'vacancy', 'graduate'
    ];
    
    jobClasses.forEach(className => {
      const elements = $(`[class*="${className}"]`);
      if (elements.length > 0) {
        console.log(`   [class*="${className}"]: ${elements.length} elements`);
        // Show first few class names
        const classNames = elements.slice(0, 3).map((i, el) => $(el).attr('class')).get();
        console.log(`     Classes: ${classNames.join(', ')}`);
      }
    });
    
    // Check for data attributes
    const dataAttrs = ['data-job', 'data-id', 'data-position', 'data-role'];
    dataAttrs.forEach(attr => {
      const elements = $(`[${attr}]`);
      if (elements.length > 0) {
        console.log(`   [${attr}]: ${elements.length} elements`);
      }
    });
    
    // Look for links that might be job links
    const jobLinks = $('a[href*="job"], a[href*="position"], a[href*="career"], a[href*="graduate"]');
    console.log(`\n🔗 Job-related links: ${jobLinks.length} found`);
    
    if (jobLinks.length > 0) {
      jobLinks.slice(0, 10).each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim().slice(0, 100);
        console.log(`   ${i + 1}. ${href} - "${text}"`);
      });
    }
    
    // Look for any text that mentions "job" or "position"
    const bodyText = $('body').text();
    const jobMentions = bodyText.match(/job|position|opening|career|graduate/gi);
    console.log(`\n📝 Job-related text mentions: ${jobMentions ? jobMentions.length : 0}`);
    
    // Show a sample of the HTML structure
    console.log('\n📋 Sample HTML structure:');
    const sampleElements = $('body > *').slice(0, 10);
    sampleElements.each((i, el) => {
      const tag = el.tagName;
      const className = $(el).attr('class') || '';
      const id = $(el).attr('id') || '';
      console.log(`   ${i + 1}. <${tag}> class="${className}" id="${id}"`);
    });
    
  } catch (error) {
    console.error('❌ Error inspecting HTML:', error.message);
  }
}

inspectHTML();
