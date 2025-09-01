#!/usr/bin/env node
/**
 * Performance Optimization Script
 * Analyzes and optimizes JobPing performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceOptimizer {
  constructor() {
    this.results = {
      bundle_analysis: null,
      lighthouse_scores: null,
      database_optimization: null,
      cache_optimization: null,
      recommendations: []
    };
  }

  async optimize() {
    console.log('⚡ JobPing Performance Optimization');
    console.log('==================================\n');

    // Analyze bundle size
    await this.analyzeBundleSize();
    
    // Run lighthouse audit
    await this.runLighthouseAudit();
    
    // Check database performance
    await this.analyzeDatabasePerformance();
    
    // Optimize caching
    await this.optimizeCaching();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Create optimization report
    this.createOptimizationReport();
    
    console.log('\n✅ Performance optimization complete!');
    console.log('📊 Check performance-report.json for detailed analysis');
  }

  async analyzeBundleSize() {
    console.log('📦 Analyzing Bundle Size...');
    
    try {
      // Check if bundle analyzer is available
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (!packageJson.scripts?.analyze) {
        console.log('  ⚠️  Adding bundle analyzer script...');
        packageJson.scripts.analyze = 'ANALYZE=true npm run build';
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      }

      // Run build to get bundle info
      console.log('  🔄 Building for analysis...');
      const buildOutput = execSync('npm run build', { encoding: 'utf8' });
      
      // Parse build output for bundle sizes
      const bundleInfo = this.parseBundleOutput(buildOutput);
      
      this.results.bundle_analysis = {
        total_size: bundleInfo.totalSize,
        largest_chunks: bundleInfo.largestChunks,
        recommendations: this.getBundleRecommendations(bundleInfo)
      };
      
      console.log(`  ✅ Bundle analysis complete (${bundleInfo.totalSize})`);
      
    } catch (error) {
      console.log(`  ❌ Bundle analysis failed: ${error.message}`);
      this.results.bundle_analysis = { error: error.message };
    }
  }

  parseBundleOutput(buildOutput) {
    // Parse Next.js build output
    const lines = buildOutput.split('\n');
    let totalSize = 'Unknown';
    const chunks = [];
    
    lines.forEach(line => {
      // Look for bundle size information
      if (line.includes('Total:') && line.includes('kB')) {
        totalSize = line.trim();
      }
      
      // Look for large chunks
      if (line.includes('.js') && line.includes('kB')) {
        chunks.push(line.trim());
      }
    });
    
    return {
      totalSize,
      largestChunks: chunks.slice(0, 5) // Top 5 largest
    };
  }

  getBundleRecommendations(bundleInfo) {
    const recommendations = [];
    
    if (bundleInfo.totalSize.includes('MB') || parseInt(bundleInfo.totalSize) > 1000) {
      recommendations.push('Consider code splitting for large components');
      recommendations.push('Implement dynamic imports for non-critical features');
      recommendations.push('Review and remove unused dependencies');
    }
    
    bundleInfo.largestChunks.forEach(chunk => {
      if (chunk.includes('puppeteer') || chunk.includes('browser')) {
        recommendations.push('Move browser automation to server-side only');
      }
      if (chunk.includes('lodash') && chunk.includes('MB')) {
        recommendations.push('Use lodash-es or individual lodash functions');
      }
    });
    
    return recommendations;
  }

  async runLighthouseAudit() {
    console.log('🔍 Running Lighthouse Audit...');
    
    try {
      // Check if lhci is configured
      if (!fs.existsSync('.lighthouserc.js')) {
        console.log('  ⚠️  Lighthouse CI not configured, skipping...');
        return;
      }
      
      console.log('  🔄 Running Lighthouse CI...');
      const lighthouseOutput = execSync('npx lhci autorun --collect.numberOfRuns=1', 
        { encoding: 'utf8', stdio: 'pipe' });
      
      // Parse lighthouse results
      const scores = this.parseLighthouseOutput(lighthouseOutput);
      
      this.results.lighthouse_scores = scores;
      console.log('  ✅ Lighthouse audit complete');
      console.log(`    Performance: ${scores.performance}/100`);
      console.log(`    Accessibility: ${scores.accessibility}/100`);
      console.log(`    Best Practices: ${scores.best_practices}/100`);
      console.log(`    SEO: ${scores.seo}/100`);
      
    } catch (error) {
      console.log(`  ❌ Lighthouse audit failed: ${error.message}`);
      this.results.lighthouse_scores = { error: error.message };
    }
  }

  parseLighthouseOutput(output) {
    // Simple parsing of lighthouse scores
    const scores = {
      performance: 0,
      accessibility: 0,
      best_practices: 0,
      seo: 0
    };
    
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.includes('Performance:')) {
        scores.performance = parseInt(line.match(/\d+/)?.[0] || '0');
      }
      if (line.includes('Accessibility:')) {
        scores.accessibility = parseInt(line.match(/\d+/)?.[0] || '0');
      }
      if (line.includes('Best Practices:')) {
        scores.best_practices = parseInt(line.match(/\d+/)?.[0] || '0');
      }
      if (line.includes('SEO:')) {
        scores.seo = parseInt(line.match(/\d+/)?.[0] || '0');
      }
    });
    
    return scores;
  }

  async analyzeDatabasePerformance() {
    console.log('🗄️  Analyzing Database Performance...');
    
    try {
      const recommendations = [];
      
      // Check for common performance issues
      const schemaFiles = this.findFiles('.', /migration.*\.sql$/);
      
      if (schemaFiles.length > 10) {
        recommendations.push('Consider consolidating old migrations');
      }
      
      // Check for missing indexes
      const tableChecks = [
        { table: 'jobs', column: 'job_hash', reason: 'Unique constraint performance' },
        { table: 'jobs', column: 'source', reason: 'Scraper filtering' },
        { table: 'jobs', column: 'posted_at', reason: 'Freshness sorting' },
        { table: 'matches', column: 'user_email', reason: 'User match retrieval' },
        { table: 'matches', column: 'matched_at', reason: 'Recent matches' },
      ];
      
      tableChecks.forEach(check => {
        recommendations.push(`Ensure index on ${check.table}(${check.column}) for ${check.reason}`);
      });
      
      // Check for potential N+1 queries
      const apiFiles = this.findFiles('app/api', /route\.ts$/);
      const potentialN1Queries = [];
      
      apiFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('.from(') && content.includes('forEach') && content.includes('.select')) {
          potentialN1Queries.push(file);
        }
      });
      
      if (potentialN1Queries.length > 0) {
        recommendations.push(`Review potential N+1 queries in: ${potentialN1Queries.join(', ')}`);
      }
      
      this.results.database_optimization = {
        migration_count: schemaFiles.length,
        index_recommendations: tableChecks,
        potential_n1_queries: potentialN1Queries,
        recommendations
      };
      
      console.log(`  ✅ Database analysis complete (${recommendations.length} recommendations)`);
      
    } catch (error) {
      console.log(`  ❌ Database analysis failed: ${error.message}`);
      this.results.database_optimization = { error: error.message };
    }
  }

  async optimizeCaching() {
    console.log('💾 Analyzing Cache Performance...');
    
    try {
      const cacheRecommendations = [];
      
      // Check for cache implementation
      const cacheFiles = this.findFiles('Utils', /cache|Cache/);
      const hasRedisCache = cacheFiles.some(file => 
        fs.readFileSync(file, 'utf8').includes('redis')
      );
      
      if (!hasRedisCache) {
        cacheRecommendations.push('Implement Redis caching for production scalability');
      }
      
      // Check for cache usage in critical paths
      const matchingFile = 'Utils/jobMatching.ts';
      if (fs.existsSync(matchingFile)) {
        const content = fs.readFileSync(matchingFile, 'utf8');
        
        if (!content.includes('getCachedMatches')) {
          cacheRecommendations.push('Implement caching in AI matching system');
        } else {
          console.log('  ✅ AI matching cache detected');
        }
        
        if (!content.includes('LRUCache')) {
          cacheRecommendations.push('Consider LRU cache for memory management');
        }
      }
      
      // Check for static generation
      const pageFiles = this.findFiles('app', /page\.tsx$/);
      const staticPages = pageFiles.filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('generateStaticParams') || content.includes('revalidate');
      });
      
      if (staticPages.length === 0) {
        cacheRecommendations.push('Consider static generation for landing pages');
      }
      
      this.results.cache_optimization = {
        redis_cache: hasRedisCache,
        static_pages: staticPages.length,
        recommendations: cacheRecommendations
      };
      
      console.log(`  ✅ Cache analysis complete (${cacheRecommendations.length} recommendations)`);
      
    } catch (error) {
      console.log(`  ❌ Cache analysis failed: ${error.message}`);
      this.results.cache_optimization = { error: error.message };
    }
  }

  generateRecommendations() {
    console.log('💡 Generating Optimization Recommendations...');
    
    const recommendations = [];
    
    // Bundle optimization
    if (this.results.bundle_analysis?.recommendations) {
      recommendations.push(...this.results.bundle_analysis.recommendations.map(r => ({
        category: 'Bundle Size',
        priority: 'medium',
        recommendation: r
      })));
    }
    
    // Performance scores
    if (this.results.lighthouse_scores) {
      const scores = this.results.lighthouse_scores;
      
      if (scores.performance < 80) {
        recommendations.push({
          category: 'Performance',
          priority: 'high',
          recommendation: 'Optimize Core Web Vitals - focus on LCP and CLS'
        });
      }
      
      if (scores.accessibility < 90) {
        recommendations.push({
          category: 'Accessibility',
          priority: 'medium',
          recommendation: 'Improve accessibility score - check ARIA labels and keyboard navigation'
        });
      }
    }
    
    // Database optimization
    if (this.results.database_optimization?.recommendations) {
      recommendations.push(...this.results.database_optimization.recommendations.map(r => ({
        category: 'Database',
        priority: 'medium',
        recommendation: r
      })));
    }
    
    // Cache optimization
    if (this.results.cache_optimization?.recommendations) {
      recommendations.push(...this.results.cache_optimization.recommendations.map(r => ({
        category: 'Caching',
        priority: 'high',
        recommendation: r
      })));
    }
    
    // JobPing-specific optimizations
    recommendations.push({
      category: 'AI Matching',
      priority: 'high',
      recommendation: 'Implement request deduplication for similar user profiles'
    });
    
    recommendations.push({
      category: 'Scraping',
      priority: 'medium', 
      recommendation: 'Implement distributed scraping with job queue system'
    });
    
    this.results.recommendations = recommendations;
    
    console.log(`  ✅ Generated ${recommendations.length} optimization recommendations`);
  }

  createOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_recommendations: this.results.recommendations.length,
        high_priority: this.results.recommendations.filter(r => r.priority === 'high').length,
        medium_priority: this.results.recommendations.filter(r => r.priority === 'medium').length,
        categories: [...new Set(this.results.recommendations.map(r => r.category))]
      },
      analysis: this.results,
      next_steps: [
        'Review high priority recommendations first',
        'Implement caching improvements for immediate impact',
        'Consider code splitting for bundle size reduction',
        'Set up continuous performance monitoring',
        'Schedule regular performance audits'
      ]
    };
    
    fs.writeFileSync('performance-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 Performance Report Summary:');
    console.log(`  Total Recommendations: ${report.summary.total_recommendations}`);
    console.log(`  High Priority: ${report.summary.high_priority}`);
    console.log(`  Medium Priority: ${report.summary.medium_priority}`);
    console.log(`  Categories: ${report.summary.categories.join(', ')}`);
  }

  findFiles(dir, pattern) {
    const files = [];
    
    const scan = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);
        
        items.forEach(item => {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scan(fullPath);
          } else if (stat.isFile() && pattern.test(item)) {
            files.push(fullPath);
          }
        });
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    scan(dir);
    return files;
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new PerformanceOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = PerformanceOptimizer;
