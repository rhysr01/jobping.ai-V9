function recordScraperRun(scraper, jobsFound, duration, errors = 0) {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'METRIC: scraper.jobs.found',
      context: {
        operation: 'scraper-execution',
        component: scraper,
        duration,
        metadata: {
          errors,
          successRate: errors === 0 ? 100 : Math.max(0, 100 - errors * 10),
          metric: {
            name: 'scraper.jobs.found',
            value: jobsFound,
            unit: 'count',
          },
        },
      },
      environment: process.env.NODE_ENV || 'development',
      service: 'jobping',
    };

    console.log(JSON.stringify(payload));
  } catch (error) {
    console.warn('⚠️  Failed to record scraper telemetry:', error?.message || error);
  }
}

module.exports = {
  recordScraperRun,
};

