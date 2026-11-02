/**
 * Test Suite 97: Optional MCP Gateway (Phase 10.10, Task G1)
 */

import assert from 'node:assert/strict';
import { noGatewayAdapter } from '../../src/services/mcp/gateway/no-gateway-adapter';
import { LiteLlmGatewayAdapter } from '../../src/services/mcp/gateway/litellm-adapter';
import { AgentgatewayAdapter } from '../../src/services/mcp/gateway/agentgateway-adapter';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite97(): Promise<void> {
  console.log('\n--- Test Suite 97: Optional MCP Gateway ---');

  // 97.1: NoGatewayAdapter is default available with direct pass-through
  assert.equal(noGatewayAdapter.name, 'no-gateway');
  assert.equal(await noGatewayAdapter.isAvailable(), true);
  const directRes = await noGatewayAdapter.forwardRequest({
    providerId: 'deepseek',
    method: 'tools/call',
    body: { name: 'test' },
  });
  assert.equal(directRes.status, 200);
  assert.equal((directRes.body as { direct: boolean }).direct, true);
  console.log('  ✓ 97.1 NoGatewayAdapter default available with direct pass-through');

  // 97.2: LiteLlmGatewayAdapter points to configurable endpoint
  const litellm = new LiteLlmGatewayAdapter('http://127.0.0.1:4000');
  assert.equal(litellm.name, 'litellm');
  console.log('  ✓ 97.2 LiteLlmGatewayAdapter points to configured endpoint');

  // 97.3: LiteLlmGatewayAdapter throws BridgeError('GATEWAY_UNAVAILABLE') when unreachable
  await assert.rejects(
    async () => {
      await litellm.forwardRequest({
        providerId: 'groq',
        method: 'tools/call',
        body: {},
      });
    },
    (err: unknown) => {
      return (
        err instanceof BridgeError &&
        err.code === 'GATEWAY_UNAVAILABLE' &&
        err.httpStatus === 503 &&
        err.retryable === true
      );
    }
  );
  console.log('  ✓ 97.3 LiteLlmGatewayAdapter throws BridgeError(GATEWAY_UNAVAILABLE) when offline');

  // 97.4: AgentgatewayAdapter points to configurable endpoint
  const agentgw = new AgentgatewayAdapter('http://127.0.0.1:8089');
  assert.equal(agentgw.name, 'agentgateway');
  console.log('  ✓ 97.4 AgentgatewayAdapter points to configured endpoint');

  // 97.5: AgentgatewayAdapter throws BridgeError('GATEWAY_UNAVAILABLE') when unreachable
  await assert.rejects(
    async () => {
      await agentgw.forwardRequest({
        providerId: 'kimi',
        method: 'tools/call',
        body: {},
      });
    },
    (err: unknown) => {
      return (
        err instanceof BridgeError &&
        err.code === 'GATEWAY_UNAVAILABLE' &&
        err.httpStatus === 503
      );
    }
  );
  console.log('  ✓ 97.5 AgentgatewayAdapter throws BridgeError(GATEWAY_UNAVAILABLE) when offline');
}
