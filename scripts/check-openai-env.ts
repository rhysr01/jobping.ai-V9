import 'dotenv/config';

console.log('OPENAI-related environment variables:');
for (const [key, value] of Object.entries(process.env)) {
  if (key.toLowerCase().includes('openai')) {
    console.log(`${key} = ${value ? value.slice(0, 10) + '...' : 'NOT SET'}`);
  }
}
