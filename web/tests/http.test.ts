import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAssessment } from '../lib/server/http.ts';
const failIfCalled = async () => {
  throw new Error('Provider must not be called');
};
void test('cross-origin requests and excessive notes cannot trigger inference', async () => {
  const foreign = new Request('http://localhost/api/assess', {
    method: 'POST',
    headers: {
      origin: 'https://foreign.example',
      'content-type': 'application/json',
    },
    body: '{"notes":[]}',
  });
  assert.equal((await handleAssessment(foreign, failIfCalled)).status, 403);
  const large = new Request('http://localhost/api/assess', {
    method: 'POST',
    headers: { origin: 'http://localhost', 'content-type': 'application/json' },
    body: JSON.stringify({ notes: Array(5).fill('note') }),
  });
  assert.equal((await handleAssessment(large, failIfCalled)).status, 400);
});
void test('malformed, blank and oversized notes fail before inference', async () => {
  for (const body of [
    '{',
    JSON.stringify({ notes: [' '] }),
    JSON.stringify({ notes: ['x'.repeat(2001)] }),
    JSON.stringify({ notes: ['x'.repeat(40001)] }),
  ]) {
    const request = new Request('http://localhost/api/assess', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body,
    });
    assert.equal((await handleAssessment(request, failIfCalled)).status, 400);
  }
});
void test('upstream details never leak through an HTTP error', async () => {
  const request = new Request('http://localhost/api/assess', {
    method: 'POST',
    headers: { origin: 'http://localhost', 'content-type': 'application/json' },
    body: '{"notes":[]}',
  });
  const result = await handleAssessment(
    request,
    async () => {
      throw new Error('private provider diagnostic');
    },
    async () => null,
  );
  assert.equal(result.status, 502);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.ok(!(await result.text()).includes('private provider diagnostic'));
});
void test('valid bounded note is included as a source in a successful response', async () => {
  const request = new Request('http://localhost/api/assess', {
    method: 'POST',
    headers: { origin: 'http://localhost', 'content-type': 'application/json' },
    body: '{"notes":["  reported observation  "]}',
  });
  const result = await handleAssessment(
    request,
    async (pairs) => ({
      model: 'test-double',
      judgments: pairs.map((pair) => ({
        ...pair,
        relation: 'insufficient',
        confidence: 0.5,
      })),
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
    async () => null,
  );
  assert.equal(result.status, 200);
  const data = (await result.json()) as { sources: { text: string }[] };
  assert.equal(data.sources.at(-1)?.text, 'reported observation');
});
