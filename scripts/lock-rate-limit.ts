import 'dotenv/config';

const DEFAULT_TOTAL_REQUESTS = 40;
const DEFAULT_CONCURRENCY = 8;

async function main() {
  const baseUrl =
    process.env.LIMITER_BASE_URL ||
    process.env.PILOT_BASE_URL ||
    process.env.NEXT_PUBLIC_URL ||
    'http://localhost:3000';

  const endpoint = process.env.LIMITER_ENDPOINT || '/api/dashboard';
  const totalRequests = Number(process.env.LIMITER_TOTAL_REQUESTS || DEFAULT_TOTAL_REQUESTS);
  const concurrency = Number(process.env.LIMITER_CONCURRENCY || DEFAULT_CONCURRENCY);

  let success = 0;
  let throttled = 0;
  let failures = 0;

  const url = new URL(endpoint, baseUrl).toString();

  const runner = async () => {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.status === 429) {
        throttled += 1;
      } else if (response.ok) {
        success += 1;
      } else {
        failures += 1;
      }
    } catch (error) {
      failures += 1;
      console.error(`Limiter test request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const requests: Promise<void>[] = [];
  for (let i = 0; i < totalRequests; i += concurrency) {
    const batchSize = Math.min(concurrency, totalRequests - i);
    const batch = new Array(batchSize).fill(null).map(() => runner());
    requests.push(
      Promise.all(batch).then(() => {
        return;
      })
    );
  }

  await Promise.all(requests);

  console.log(
    `Limiter flood summary: ${success} succeeded, ${throttled} rate-limited, ${failures} failed (total ${totalRequests}).`
  );

  if (throttled === 0) {
    console.error('❌ Rate limiter did not engage – expected at least one 429 response.');
    process.exit(1);
  }

  if (failures > totalRequests * 0.1) {
    console.error('❌ Too many unexpected failures while exercising the limiter.');
    process.exit(1);
  }

  console.log('✅ Rate limiter engaged as expected.');
}

main().catch((error) => {
  console.error('Limiter flood test crashed:', error);
  process.exit(1);
});

