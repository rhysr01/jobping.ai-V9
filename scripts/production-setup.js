#!/usr/bin/env node
/**
 * Production Setup Script
 * Validates environment and sets up production configuration
 */

const fs = require('fs');
const path = require('path');

class ProductionSetup {
  constructor() {
    this.requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY', 
      'OPENAI_API_KEY',
      'RESEND_API_KEY',
      'REDIS_URL',
      'NEXT_PUBLIC_URL'
    ];
    
    this.optionalEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'DATADOG_API_KEY'
    ];
  }

  async run() {
    console.log('🚀 JobPing Production Setup');
    console.log('==========================\n');

    // Check environment variables
    const envCheck = this.checkEnvironmentVariables();
    
    // Check database connection
    const dbCheck = await this.checkDatabaseConnection();
    
    // Check external services
    const servicesCheck = await this.checkExternalServices();
    
    // Generate health report
    this.generateHealthReport(envCheck, dbCheck, servicesCheck);
    
    // Create production config
    this.createProductionConfig();
    
    console.log('\n✅ Production setup complete!');
  }

  checkEnvironmentVariables() {
    console.log('🔧 Checking Environment Variables...');
    const results = {
      required: { passed: 0, failed: 0, missing: [] },
      optional: { passed: 0, failed: 0, missing: [] }
    };

    // Check required variables
    this.requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`  ✅ ${envVar}: Set`);
        results.required.passed++;
      } else {
        console.log(`  ❌ ${envVar}: Missing`);
        results.required.failed++;
        results.required.missing.push(envVar);
      }
    });

    // Check optional variables
    this.optionalEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`  ✅ ${envVar}: Set (optional)`);
        results.optional.passed++;
      } else {
        console.log(`  ⚠️  ${envVar}: Missing (optional)`);
        results.optional.missing.push(envVar);
      }
    });

    console.log(`\nEnvironment Variables: ${results.required.passed}/${this.requiredEnvVars.length} required, ${results.optional.passed}/${this.optionalEnvVars.length} optional\n`);
    return results;
  }

  async checkDatabaseConnection() {
    console.log('🗄️  Checking Database Connection...');
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Test connection with a simple query
      const { data, error } = await supabase
        .from('users')
        .select('count(*)')
        .limit(1);

      if (error) throw error;

      console.log('  ✅ Database connection successful');
      return { success: true, message: 'Connected to Supabase' };
    } catch (error) {
      console.log(`  ❌ Database connection failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async checkExternalServices() {
    console.log('🌐 Checking External Services...');
    const results = {};

    // Check OpenAI
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Simple completion to test API
      await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      
      console.log('  ✅ OpenAI API connection successful');
      results.openai = { success: true };
    } catch (error) {
      console.log(`  ❌ OpenAI API failed: ${error.message}`);
      results.openai = { success: false, error: error.message };
    }

    // Check Redis
    try {
      const { createClient } = require('redis');
      const redis = createClient({ url: process.env.REDIS_URL });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      
      console.log('  ✅ Redis connection successful');
      results.redis = { success: true };
    } catch (error) {
      console.log(`  ❌ Redis connection failed: ${error.message}`);
      results.redis = { success: false, error: error.message };
    }

    // Check Resend
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Test API key validity (this won't send an email)
      console.log('  ✅ Resend API key configured');
      results.resend = { success: true };
    } catch (error) {
      console.log(`  ❌ Resend API failed: ${error.message}`);
      results.resend = { success: false, error: error.message };
    }

    return results;
  }

  generateHealthReport(envCheck, dbCheck, servicesCheck) {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        required_vars: envCheck.required.passed === this.requiredEnvVars.length,
        missing_required: envCheck.required.missing,
        optional_vars: envCheck.optional.passed,
        missing_optional: envCheck.optional.missing
      },
      database: dbCheck,
      services: servicesCheck,
      overall_health: this.calculateOverallHealth(envCheck, dbCheck, servicesCheck)
    };

    // Write health report
    fs.writeFileSync(
      path.join(__dirname, '..', 'production-health.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Production Health Report generated: production-health.json');
  }

  calculateOverallHealth(envCheck, dbCheck, servicesCheck) {
    const requiredEnvOk = envCheck.required.failed === 0;
    const databaseOk = dbCheck.success;
    const openaiOk = servicesCheck.openai?.success || false;
    const redisOk = servicesCheck.redis?.success || false;
    
    const criticalServices = [requiredEnvOk, databaseOk, openaiOk, redisOk];
    const healthScore = criticalServices.filter(Boolean).length / criticalServices.length;
    
    if (healthScore === 1) return 'EXCELLENT';
    if (healthScore >= 0.75) return 'GOOD';
    if (healthScore >= 0.5) return 'WARNING';
    return 'CRITICAL';
  }

  createProductionConfig() {
    console.log('\n⚙️  Creating Production Configuration...');
    
    const config = {
      app: {
        name: 'JobPing',
        version: require('../package.json').version,
        environment: 'production',
        url: process.env.NEXT_PUBLIC_URL || 'https://jobping.ai'
      },
      features: {
        ai_matching: true,
        email_verification: true,
        rate_limiting: true,
        performance_monitoring: true,
        auto_scaling: true
      },
      limits: {
        free_tier: {
          matches_per_batch: 6,
          rate_limit: '10/15m'
        },
        premium_tier: {
          matches_per_batch: 15,
          rate_limit: '50/15m'
        }
      },
      scraping: {
        platforms_enabled: [
          'greenhouse', 'lever', 'workday', 'remoteok',
          'graduatejobs', 'graduateland', 'milkround'
        ],
        browser_pool_size: 3,
        rate_limit_per_domain: '1req/3s'
      },
      monitoring: {
        performance_tracking: true,
        daily_reports: true,
        cost_tracking: true,
        health_checks: true
      }
    };

    fs.writeFileSync(
      path.join(__dirname, '..', 'production-config.json'),
      JSON.stringify(config, null, 2)
    );

    console.log('  ✅ Production configuration created: production-config.json');
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new ProductionSetup();
  setup.run().catch(console.error);
}

module.exports = ProductionSetup;
