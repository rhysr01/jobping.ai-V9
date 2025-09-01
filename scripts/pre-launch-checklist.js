      {
        name: 'Caching implementation',
        test: () => {
          const cacheFiles = [
            'Utils/enhancedCache.ts',
            'Utils/jobMatching.ts' // Contains AIMatchingCache
          ];
          const hasCache = cacheFiles.some(file => {
            if (!fs.existsSync(file)) return false;
            const content = fs.readFileSync(file, 'utf8');
            return content.includes('Cache') || content.includes('cache');
          });
          return { 
            pass: hasCache,
            details: hasCache ? 'Caching system implemented' : 'Caching system missing'
          };
        }
      },
      {
        name: 'Next.js optimization',
        test: () => {
          const nextConfigFile = 'next.config.ts';
          if (!fs.existsSync(nextConfigFile)) {
            return { pass: false, details: 'next.config.ts missing' };
          }
          
          const content = fs.readFileSync(nextConfigFile, 'utf8');
          const hasOptimizations = content.includes('swcMinify') || content.includes('compress');
          return { 
            pass: hasOptimizations,
            details: hasOptimizations ? 'Next.js optimizations enabled' : 'Next.js optimizations missing'
          };
        }
      },
      {
        name: 'Auto-scaling capabilities',
        test: () => {
          const autoScaleFile = 'Utils/autoScaling.ts';
          return { 
            pass: fs.existsSync(autoScaleFile),
            details: fs.existsSync(autoScaleFile) ? 'Auto-scaling implemented' : 'Auto-scaling missing'
          };
        }
      },
      {
        name: 'Browser pool optimization',
        test: () => {
          const scraperFiles = this.findFiles('scrapers', /\.ts$/);
          const hasBrowserPool = scraperFiles.some(file => {
            const content = fs.readFileSync(file, 'utf8');
            return content.includes('BrowserPool') || content.includes('browser pool');
          });
          return { 
            pass: hasBrowserPool,
            details: hasBrowserPool ? 'Browser pooling implemented' : 'Browser pooling missing'
          };
        }
      }
    ];

    await this.runChecks('performance', checks);
  }

  async checkMonitoring() {
    console.log('\n📊 Monitoring & Observability');
    console.log('-----------------------------');
    
    const checks = [
      {
        name: 'Advanced monitoring system',
        test: () => {
          const monitoringFile = 'Utils/advancedMonitoring.ts';
          return { 
            pass: fs.existsSync(monitoringFile),
            details: fs.existsSync(monitoringFile) ? 'Advanced monitoring implemented' : 'Advanced monitoring missing'
          };
        }
      },
      {
        name: 'Error monitoring',
        test: () => {
          const errorMonitorFile = 'Utils/errorMonitoring.ts';
          return { 
            pass: fs.existsSync(errorMonitorFile),
            details: fs.existsSync(errorMonitorFile) ? 'Error monitoring implemented' : 'Error monitoring missing'
          };
        }
      },
      {
        name: 'User segmentation analytics',
        test: () => {
          const segmentationFile = 'Utils/userSegmentation.ts';
          return { 
            pass: fs.existsSync(segmentationFile),
            details: fs.existsSync(segmentationFile) ? 'User segmentation implemented' : 'User segmentation missing'
          };
        }
      },
      {
        name: 'Dashboard endpoint',
        test: () => {
          const dashboardFile = 'app/api/dashboard/route.ts';
          return { 
            pass: fs.existsSync(dashboardFile),
            details: fs.existsSync(dashboardFile) ? 'Dashboard endpoint exists' : 'Dashboard endpoint missing'
          };
        }
      },
      {
        name: 'Lighthouse CI configuration',
        test: () => {
          const lighthouseConfig = '.lighthouserc.js';
          return { 
            pass: fs.existsSync(lighthouseConfig),
            details: fs.existsSync(lighthouseConfig) ? 'Lighthouse CI configured' : 'Lighthouse CI missing'
          };
        }
      },
      {
        name: 'Testing infrastructure',
        test: () => {
          const testFiles = [
            'jest.config.js',
            'playwright.config.ts',
            '__tests__'
          ];
          const hasTests = testFiles.every(file => fs.existsSync(file));
          return { 
            pass: hasTests,
            details: hasTests ? 'Testing infrastructure complete' : 'Testing infrastructure incomplete'
          };
        }
      }
    ];

    await this.runChecks('monitoring', checks);
  }

  async runChecks(category, checks) {
    this.results[category].total = checks.length;
    
    for (const check of checks) {
      try {
        const result = await check.test();
        const status = result.pass ? '✅' : '❌';
        console.log(`  ${status} ${check.name}: ${result.details}`);
        
        if (result.pass) {
          this.results[category].passed++;
        } else {
          this.results[category].issues.push({
            check: check.name,
            issue: result.details,
            priority: this.getPriority(category, check.name)
          });
        }
      } catch (error) {
        console.log(`  ❌ ${check.name}: Error - ${error.message}`);
        this.results[category].issues.push({
          check: check.name,
          issue: `Error: ${error.message}`,
          priority: 'high'
        });
      }
    }
    
    const score = Math.round((this.results[category].passed / this.results[category].total) * 100);
    console.log(`\n${category.toUpperCase()} SCORE: ${this.results[category].passed}/${this.results[category].total} (${score}%)`);
  }

  getPriority(category, checkName) {
    const highPriorityChecks = [
      'Production environment variables',
      'Database connection', 
      'Required tables exist',
      'Health endpoint',
      'Tally webhook endpoint',
      'Resend configuration',
      'API key management'
    ];
    
    const mediumPriorityChecks = [
      'Email verification columns',
      'Rate limiting implementation',
      'Email verification utilities',
      'Performance monitoring',
      'Caching implementation'
    ];
    
    if (highPriorityChecks.includes(checkName)) return 'high';
    if (mediumPriorityChecks.includes(checkName)) return 'medium';
    return 'low';
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        overall_score: this.calculateOverallScore(),
        category_scores: {},
        critical_issues: this.getCriticalIssues(),
        ready_for_launch: this.isReadyForLaunch()
      },
      categories: this.results,
      recommendations: this.generateRecommendations()
    };
    
    // Calculate category scores
    Object.keys(this.results).forEach(category => {
      const result = this.results[category];
      report.summary.category_scores[category] = {
        score: Math.round((result.passed / result.total) * 100),
        passed: result.passed,
        total: result.total
      };
    });
    
    fs.writeFileSync('pre-launch-checklist.json', JSON.stringify(report, null, 2));
    
    // Also create a simple checklist for manual review
    this.createManualChecklist(report);
  }

  calculateOverallScore() {
    const totalPassed = Object.values(this.results).reduce((sum, category) => sum + category.passed, 0);
    const totalChecks = Object.values(this.results).reduce((sum, category) => sum + category.total, 0);
    return Math.round((totalPassed / totalChecks) * 100);
  }

  getCriticalIssues() {
    const criticalIssues = [];
    Object.values(this.results).forEach(category => {
      category.issues.forEach(issue => {
        if (issue.priority === 'high') {
          criticalIssues.push(issue);
        }
      });
    });
    return criticalIssues;
  }

  isReadyForLaunch() {
    const overallScore = this.calculateOverallScore();
    const criticalIssues = this.getCriticalIssues();
    
    return overallScore >= 85 && criticalIssues.length === 0;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Critical path recommendations
    const criticalIssues = this.getCriticalIssues();
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'URGENT',
        category: 'Critical Issues',
        action: `Resolve ${criticalIssues.length} critical issues before launch`,
        details: criticalIssues.map(issue => issue.issue)
      });
    }
    
    // Email verification
    if (this.results.email_system.passed < this.results.email_system.total) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Email System',
        action: 'Complete email verification system setup',
        details: ['Test email delivery with real addresses', 'Verify email templates render correctly']
      });
    }
    
    // Performance optimizations
    if (this.results.performance.passed < this.results.performance.total) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Performance',
        action: 'Implement missing performance optimizations',
        details: ['Enable caching for AI matching', 'Configure auto-scaling triggers']
      });
    }
    
    // Monitoring setup
    if (this.results.monitoring.passed < this.results.monitoring.total) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Monitoring',
        action: 'Complete monitoring and observability setup',
        details: ['Configure dashboard endpoints', 'Set up automated alerts']
      });
    }
    
    return recommendations;
  }

  createManualChecklist(report) {
    const checklist = `# JobPing Pre-Launch Manual Checklist

## Overall Status: ${report.summary.ready_for_launch ? '✅ READY' : '⚠️ NOT READY'} (${report.summary.overall_score}%)

## Critical Actions Required:
${report.recommendations
  .filter(r => r.priority === 'URGENT' || r.priority === 'HIGH')
  .map(r => `- [ ] ${r.action}`)
  .join('\n')}

## Manual Verification Tasks:

### Email System Testing
- [ ] Send test verification email to real address
- [ ] Verify email renders correctly in Gmail, Outlook, Apple Mail
- [ ] Test verification link expiration (24 hours)
- [ ] Confirm email delivery rates > 95%

### User Flow Testing  
- [ ] Complete user registration via Tally form
- [ ] Verify user appears in Supabase dashboard
- [ ] Test AI matching generates 6+ quality matches
- [ ] Verify match emails are delivered and formatted correctly

### Performance Testing
- [ ] Test with 20+ concurrent users
- [ ] Verify rate limiting works (10 req/15min for free tier)
- [ ] Check response times < 2 seconds for all endpoints
- [ ] Confirm browser pool handles scraping load

### Security Verification
- [ ] Verify no API keys exposed in client-side code
- [ ] Test rate limiting prevents abuse
- [ ] Confirm CORS headers are properly configured
- [ ] Verify error messages don't leak sensitive data

### Monitoring Setup
- [ ] Configure production alerts for system health
- [ ] Set up daily performance reports
- [ ] Test error notification system
- [ ] Verify cost tracking for OpenAI usage

## Environment Checklist:
- [ ] All production environment variables configured
- [ ] Database migrations applied successfully
- [ ] Redis connection established and working
- [ ] OpenAI API key has sufficient credits
- [ ] Resend API key configured with proper domain
- [ ] Vercel deployment pipeline working

## Go/No-Go Criteria:
✅ Must Have (Blockers):
- [ ] All environment variables configured
- [ ] Database connection working
- [ ] Email verification system functional
- [ ] AI matching system operational
- [ ] Rate limiting active
- [ ] Health endpoint returning 200

⚠️ Should Have (Address before full launch):
- [ ] Performance monitoring active
- [ ] Auto-scaling configured
- [ ] User segmentation working
- [ ] Dashboard endpoints functional
- [ ] Error alerting configured

Generated: ${new Date().toISOString()}
`;

    fs.writeFileSync('MANUAL-CHECKLIST.md', checklist);
    console.log('\n📋 Manual checklist created: MANUAL-CHECKLIST.md');
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
    
    if (fs.existsSync(dir)) {
      scan(dir);
    }
    return files;
  }

  findCodeFiles() {
    return [
      ...this.findFiles('app', /\.(ts|tsx|js|jsx)$/),
      ...this.findFiles('Utils', /\.(ts|tsx|js|jsx)$/),
      ...this.findFiles('scrapers', /\.(ts|tsx|js|jsx)$/),
    ];
  }
}

// Fix the typos in the checks
const fixTypos = (code) => {
  return code.replace(/fs\.existsExists/g, 'fs.existsSync');
};

// Run checklist if called directly
if (require.main === module) {
  const checker = new PreLaunchChecker();
  checker.runChecklist().catch(console.error);
}

module.exports = PreLaunchChecker;
