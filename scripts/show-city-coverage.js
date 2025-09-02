#!/usr/bin/env node

/**
 * Show City Coverage for All Scrapers
 * Displays which cities each scraper targets
 */

console.log('🌍 JobPing City Coverage Summary\n');

// Adzuna Coverage
console.log('📍 Adzuna Scraper:');
console.log('   • Dublin (IE) - English');
console.log('   • London (GB) - English');
console.log('   • Madrid (ES) - Spanish');
console.log('   • Berlin (DE) - German');
console.log('   • Paris (FR) - French');
console.log('   • Barcelona (ES) - Spanish');
console.log('   • Zurich (CH) - German');
console.log('   • Milan (IT) - Italian');
console.log('   • Rome (IT) - Italian');
console.log('   • Amsterdam (NL) - Dutch');
console.log('   📊 Total: 10 cities across 8 countries\n');

// Reed Coverage
console.log('📍 Reed Scraper:');
console.log('   • London (GB) - English');
console.log('   📊 Total: 1 city (UK focus)\n');

// InfoJobs Coverage
console.log('📍 InfoJobs Scraper:');
console.log('   • Madrid (ES) - Spanish');
console.log('   • Barcelona (ES) - Spanish');
console.log('   📊 Total: 2 cities (Spain focus)\n');

// Multi-Source Coverage
console.log('🎯 Multi-Source Orchestrator:');
console.log('   • Dublin (IE) - English');
console.log('   • London (GB) - English');
console.log('   • Madrid (ES) - Spanish');
console.log('   • Berlin (DE) - German');
console.log('   • Paris (FR) - French');
console.log('   • Barcelona (ES) - Spanish');
console.log('   • Zurich (CH) - German');
console.log('   • Milan (IT) - Italian');
console.log('   • Rome (IT) - Italian');
console.log('   • Amsterdam (NL) - Dutch');
console.log('   📊 Total: 10 cities across 8 countries\n');

// Language Support
console.log('🌐 Language Support:');
console.log('   • English: Dublin, London');
console.log('   • Spanish: Madrid, Barcelona');
console.log('   • German: Berlin, Zurich');
console.log('   • French: Paris');
console.log('   • Italian: Milan, Rome');
console.log('   • Dutch: Amsterdam\n');

// Early Career Patterns
console.log('🎓 Early Career Detection:');
console.log('   • English: intern, graduate, junior, trainee, entry-level');
console.log('   • Spanish: becario, prácticas, junior, recién graduado');
console.log('   • German: praktikant, praktikum, trainee, berufseinsteiger');
console.log('   • French: stagiaire, alternance, junior, débutant');
console.log('   • Italian: stagista, tirocinio, junior, principiante');
console.log('   • Dutch: stagiair, werkstudent, junior, starter\n');

console.log('✅ All target cities are now covered!');
console.log('📝 Next: Test individual scrapers for each city');
