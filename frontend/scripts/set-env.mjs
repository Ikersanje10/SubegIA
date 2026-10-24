import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// .env lives in the project root (SubegIA/), two levels above this script
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const token = process.env.CESIUM_ION_TOKEN ?? '';

const content = `export const environment = {
  cesiumIonToken: '${token}',
};
`;

mkdirSync('src/environments', { recursive: true });
writeFileSync('src/environments/environment.ts', content);
writeFileSync('src/environments/environment.development.ts', content);

if (!token) {
  console.warn('CESIUM_ION_TOKEN is empty. Is .env in the project root?');
} else {
  console.log(`Token loaded (${token.length} characters)`);
}