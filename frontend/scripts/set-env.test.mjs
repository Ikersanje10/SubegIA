import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(new URL('./set-env.mjs', import.meta.url));

function generate(api, token = 'public-test-token') {
  const cwd = mkdtempSync(join(tmpdir(), 'subegia-config-'));
  try {
    const result = spawnSync(process.execPath, [script, '--production'], {
      cwd, encoding: 'utf8',
      env: { ...process.env, API_BASE_URL: api, CESIUM_ION_TOKEN: token },
    });
    const content = result.status === 0
      ? readFileSync(join(cwd, 'src/environments/environment.ts'), 'utf8') : null;
    return { ...result, content };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test('production rejects missing or unsafe deployment configuration', () => {
  for (const api of ['', 'http://localhost:8080', 'https://localhost',
    'https://user:password@example.com', 'https://example.com/api', 'https://example.com?query=1']) {
    assert.notEqual(generate(api).status, 0);
  }
  assert.notEqual(generate('https://api.example.com', '').status, 0);
});

test('production generates escaped values and normalizes the API origin', () => {
  const token = "public-'test\n-token";
  const result = generate('https://api.example.com/', token);
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.content.replace(/^export const environment = /, '').replace(/;\n$/, ''));
  assert.deepEqual(config, { cesiumIonToken: token, apiBaseUrl: 'https://api.example.com' });
  assert.equal(result.stdout.includes(token), false);
});
