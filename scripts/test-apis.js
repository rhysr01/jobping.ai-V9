#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

async function testAPIs() {
  console.log('Testing API Keys...\n');

  // SERP API
  const serpKey = process.env.SERP_API_KEY;
  if (serpKey) {
    try {
      const res = await fetch(`https://serpapi.com/account?api_key=${serpKey}`);
      const data = await res.json();
      console.log('✅ SERP API:', data.account_email, `(${data.searches_remaining}/${data.plan_searches_left} searches)`);
    } catch (e) {
      console.log('❌ SERP API failed:', e.message);
    }
  } else {
    console.log('⚠️ SERP API: Key missing');
  }

  // RapidAPI / JSearch
  const rapidKey = process.env.RAPIDAPI_KEY;
  if (rapidKey) {
    try {
      const res = await fetch('https://jsearch.p.rapidapi.com/search?query=test&page=1', {
        headers: {
          'X-RapidAPI-Key': rapidKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });
      console.log('✅ JSearch API:', res.ok ? 'Working' : `Error ${res.status}`);
    } catch (e) {
      console.log('❌ JSearch API failed:', e.message);
    }
  } else {
    console.log('⚠️ JSearch: RAPIDAPI_KEY missing');
  }

  // Jooble
  const joobleKey = process.env.JOOBLE_API_KEY;
  console.log(joobleKey ? '✅ Jooble API: Key present' : '⚠️ Jooble API: Key missing');

  // Reed
  const reedKey = process.env.REED_API_KEY;
  console.log(reedKey ? '✅ Reed API: Key present' : '⚠️ Reed API: Key missing');
}

testAPIs();


