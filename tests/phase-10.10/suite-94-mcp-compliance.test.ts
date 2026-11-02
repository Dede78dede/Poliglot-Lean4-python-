/**
 * Test Suite 94: MCP 2026-07-28 Compliance (Phase 10.10, Task M1)
 *
 * Verifies:
 * 94.1: server/discover returns protocolVersions: ['2026-07-28'] and capabilities
 * 94.2: Missing Mcp-Method header returns 400 Bad Request
 * 94.3: tools/call missing Mcp-Name header returns 400 Bad Request
 * 94.4: Response echoes MCP-Protocol-Version: 2026-07-28
 * 94.5: GET /api/v1/mcp returns 405 Method Not Allowed with Allow: POST
 * 94.6: DELETE /api/v1/mcp returns 405 Method Not Allowed with Allow: POST
 */

import assert from 'node:assert/strict';
import { streamableHttpServerHandler } from '../../src/services/mcp/transports/streamable-http';
import { getMcpDiscoverPayload } from '../../src/services/mcp/mcp-discover';

export async function runSuite94(): Promise<void> {
  console.log('\n--- Test Suite 94: MCP 2026-07-28 Compliance ---');

  // 94.1: server/discover returns protocolVersions: ['2026-07-28'] and capabilities
  const discoverRes = await streamableHttpServerHandler.handleRequest({
    method: 'POST',
    path: '/api/v1/mcp',
    headers: { 'Mcp-Method': 'server/discover' },
    body: { jsonrpc: '2.0', id: 1 },
  });
  assert.equal(discoverRes.status, 200);
  const discoverBody = discoverRes.body as { result: ReturnType<typeof getMcpDiscoverPayload> };
  assert.deepEqual(discoverBody.result.protocolVersions, ['2026-07-28']);
  assert.equal(discoverBody.result.serverInfo.name, 'polyglot-code-studio');
  assert.equal(discoverBody.result.serverInfo.vendor, 'polyglot');
  assert.equal(discoverBody.result.capabilities.tools.listChanged, false);
  console.log('  ✓ 94.1 server/discover returns protocolVersions: [2026-07-28] and static capabilities');

  // 94.2: Missing Mcp-Method header returns 400 Bad Request
  const noMethodRes = await streamableHttpServerHandler.handleRequest({
    method: 'POST',
    path: '/api/v1/mcp',
    headers: {},
    body: { jsonrpc: '2.0', id: 2 },
  });
  assert.equal(noMethodRes.status, 400);
  assert.ok(JSON.stringify(noMethodRes.body).includes('Mcp-Method header missing'));
  console.log('  ✓ 94.2 Missing Mcp-Method header returns 400 Bad Request');

  // 94.3: tools/call missing Mcp-Name header returns 400 Bad Request
  const noToolNameRes = await streamableHttpServerHandler.handleRequest({
    method: 'POST',
    path: '/api/v1/mcp',
    headers: { 'Mcp-Method': 'tools/call' },
    body: { jsonrpc: '2.0', id: 3, params: {} },
  });
  assert.equal(noToolNameRes.status, 400);
  assert.ok(JSON.stringify(noToolNameRes.body).includes('Mcp-Name header missing for tools/call'));
  console.log('  ✓ 94.3 tools/call missing Mcp-Name header returns 400 Bad Request');

  // 94.4: Response echoes MCP-Protocol-Version: 2026-07-28
  assert.equal(discoverRes.headers['MCP-Protocol-Version'], '2026-07-28');
  assert.equal(noMethodRes.headers['MCP-Protocol-Version'], '2026-07-28');
  console.log('  ✓ 94.4 Response echoes MCP-Protocol-Version: 2026-07-28 header');

  // 94.5: GET /api/v1/mcp returns 405 Method Not Allowed with Allow: POST
  const getRes = await streamableHttpServerHandler.handleRequest({
    method: 'GET',
    path: '/api/v1/mcp',
    headers: {},
    body: null,
  });
  assert.equal(getRes.status, 405);
  assert.equal(getRes.headers['Allow'], 'POST');
  console.log('  ✓ 94.5 GET /api/v1/mcp returns 405 Method Not Allowed with Allow: POST');

  // 94.6: DELETE /api/v1/mcp returns 405 Method Not Allowed with Allow: POST
  const deleteRes = await streamableHttpServerHandler.handleRequest({
    method: 'DELETE',
    path: '/api/v1/mcp',
    headers: {},
    body: null,
  });
  assert.equal(deleteRes.status, 405);
  assert.equal(deleteRes.headers['Allow'], 'POST');
  console.log('  ✓ 94.6 DELETE /api/v1/mcp returns 405 Method Not Allowed with Allow: POST');
}
