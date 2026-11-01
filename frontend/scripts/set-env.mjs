import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// .env lives in the project root (SubegIA/), two levels above this script
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const token = process.env.CESIUM_ION_TOKEN ?? '';
const production = process.argv.includes('--production');
const apiBaseUrl = (process.env.API_BASE_URL ?? (production ? '' : 'http://localhost:8080')).replace(/\/+$/, '');
if (!apiBaseUrl) throw new Error('API_BASE_URL is required for a production build.');
const apiUrl = new URL(apiBaseUrl);
if (!['http:', 'https:'].includes(apiUrl.protocol) || apiUrl.username || apiUrl.password
  || apiUrl.search || apiUrl.hash || apiUrl.pathname !== '/') {
  throw new Error('API_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
}
if (production && (apiUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(apiUrl.hostname))) {
  throw new Error('Production API_BASE_URL must use HTTPS and cannot point to localhost.');
}
if (production && !token) throw new Error('CESIUM_ION_TOKEN is required for a production build.');

const content = `export const environment = ${JSON.stringify({ cesiumIonToken: token, apiBaseUrl }, null, 2)};\n`;

mkdirSync('src/environments', { recursive: true });
writeFileSync('src/environments/environment.ts', content);
writeFileSync('src/environments/environment.development.ts', content);

if (!token) {
  console.warn('CESIUM_ION_TOKEN is empty. Is .env in the project root?');
} else {
  console.log(`Token loaded (${token.length} characters)`);
}