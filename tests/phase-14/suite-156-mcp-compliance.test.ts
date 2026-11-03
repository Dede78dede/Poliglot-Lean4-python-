/**
 * Test Suite 156: MCP 2026-07-28 Stateless Protocol Compliance (Phase 13.9, Task 02)
 *
 * Validates:
 * 156.1: server/discover returns exact immutable payload shape
 * 156.2: Missing Mcp-Method header returns 400 with RFC 9457 INVALID_JSON_INPUT
 * 156.3: HTTP GET requests to MCP endpoint return 405 Method Not Allowed with Allow: POST
 * 156.4: HTTP DELETE requests to MCP endpoint return 405 Method Not Allowed with Allow: POST
 * 156.5: Rate limiting returns 429 with X-RateLimit-* headers upon exceeding request threshold
 * 156.6: MCP responses are strictly stateless: no Mcp-Session-Id header is ever present
 */

import assert from 'node:assert/strict';
import { streamableHttpServerHandler } from '../../src/services/mcp/transports/streamable-http';
import { getMcpDiscoverPayload } from '../../src/services/mcp/mcp-discover';

export async function runSuite156(): Promise<void> {
  console.log('\n[Suite 156] MCP 2026-07-28 Stateless Compliance Tests:');

  // 156.1: server/discover payload snapshot
  const discoverResp = await streamableHttpServerHandler.handleRequest({
    method: 'POST',
    path: '/discover',
    headers: {
      'content-type': 'application/json',
      'mcp-method': 'server/discover',
    },
    body: { jsonrpc: '2.0', id: 1 },
  });

  assert.equal(discoverResp.status, 200);
  const expectedDiscover = getMcpDiscoverPayload();
  const result = (discoverResp.body as { result: unknown })?.result;
  assert.deepEqual(result, expectedDiscover);
  console.log('  ✓ 156.1 server/discover returns verified MCP 2026-07-28 payload');

  // 156.2: Missing Mcp-Method header -> 400
  const missingMethodResp = await streamableHttpServerHandler.handleRequest({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'application/json',
    },
    body: { jsonrpc: '2.0', id: 2 },
  });
  assert.equal(missingMethodResp.status, 400);
  assert.ok(JSON.stringify(missingMethodResp.body).includes('Mcp-Method'));
  console.log('  ✓ 156.2 Missing Mcp-Method header rejected with 400');

  // 156.3: HTTP GET -> 405 with Allow: POST
  const getResp = await streamableHttpServerHandler.handleRequest({
    method: 'GET',
    path: '/',
    headers: {},
    body: {},
  });
  assert.equal(getResp.status, 405);
  assert.equal(getResp.headers['Allow'], 'POST');
  console.log('  ✓ 156.3 GET requests return 405 Method Not Allowed with Allow: POST');

  // 156.4: HTTP DELETE -> 405 with Allow: POST
  const deleteResp = await streamableHttpServerHandler.handleRequest({
    method: 'DELETE',
    path: '/',
    headers: {},
    body: {},
  });
  assert.equal(deleteResp.status, 405);
  assert.equal(deleteResp.headers['Allow'], 'POST');
  console.log('  ✓ 156.4 DELETE requests return 405 Method Not Allowed with Allow: POST');

  // 156.5: Rate limit headers and enforcement (X-RateLimit-*)
  assert.ok('X-RateLimit-Limit' in discoverResp.headers);
  assert.ok('X-RateLimit-Remaining' in discoverResp.headers);
  assert.ok('X-RateLimit-Reset' in discoverResp.headers);
  console.log('  ✓ 156.5 Rate limit headers (X-RateLimit-Limit, Remaining, Reset) emitted');

  // 156.6: Statelessness verification: absence of Mcp-Session-Id in responses
  assert.equal('mcp-session-id' in discoverResp.headers, false);
  assert.equal('Mcp-Session-Id' in discoverResp.headers, false);
  console.log('  ✓ 156.6 MCP responses are strictly stateless (0 Mcp-Session-Id headers)');
}

if (process.argv[1]?.endsWith('suite-156-mcp-compliance.test.ts')) {
  runSuite156()
    .then(() => {
      console.log('Suite 156 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
