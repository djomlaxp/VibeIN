// Loads the published site like a phone would and reports crashes.
import { chromium, devices } from 'playwright';

const url = process.env.SITE_URL || 'https://djomlaxp.github.io/VibeIN/';
const browser = await chromium.launch();
const page = await browser.newPage({ ...devices['Pixel 7'], colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack}`));
page.on('console', (m) => m.type() === 'error' && console.log('console error:', m.text()));
page.on('response', (r) => r.url().includes('supabase.co') && console.log(r.status(), r.url()));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const text = await page.innerText('body');
console.log('Page text:\n' + text);
await browser.close();

if (errors.length) {
  console.log('Page errors:\n' + errors.join('\n\n'));
  process.exit(1);
}
if (!text.includes('Test klub Centar') && !/Klub ·/.test(text)) {
  console.log('No venues shown');
  process.exit(1);
}
