import { storage } from './server/storage.ts';

async function test() {
  console.log('Testing getPesoBrutoByTalhao for 24/25...');
  const result = await storage.getPesoBrutoByTalhao('24/25');
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}
test();
