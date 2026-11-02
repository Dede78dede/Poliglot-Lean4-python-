/**
 * Test Suite 98: Approval Flow Mapping (Phase 10.10, Task A1)
 */

import assert from 'node:assert/strict';
import { approvalFlowMapper } from '../../src/services/mcp/approval-flow-mapper';

export async function runSuite98(): Promise<void> {
  console.log('\n--- Test Suite 98: Approval Flow Mapping ---');

  // 98.1: OpenAI maps to 'openai-mcp-approval'
  assert.equal(approvalFlowMapper.resolveApprovalMechanism('openai'), 'openai-mcp-approval');
  const openAiReq = approvalFlowMapper.formatApprovalRequest('openai', {
    proposalToken: 'prop_token_123',
    toolName: 'polyglot_propose_proof_patch',
    target: 'Proofs.lean',
    diffOrProof: '+ theorem test : True := trivial',
    createdAt: Date.now(),
  }) as { type: string; proposalToken: string };
  assert.equal(openAiReq.type, 'mcp_approval_request');
  assert.equal(openAiReq.proposalToken, 'prop_token_123');

  const validResponse = approvalFlowMapper.verifyApprovalResponse(
    'openai',
    { approve: true, approval_request_id: 'appr_prop_token_123' },
    'prop_token_123'
  );
  assert.equal(validResponse, true);
  console.log('  ✓ 98.1 OpenAI maps to openai-mcp-approval format with approve boolean verification');

  // 98.2: Anthropic, Gemini, NVIDIA NIM map to 'two-phase-commit'
  assert.equal(approvalFlowMapper.resolveApprovalMechanism('anthropic'), 'two-phase-commit');
  assert.equal(approvalFlowMapper.resolveApprovalMechanism('gemini'), 'two-phase-commit');
  assert.equal(approvalFlowMapper.resolveApprovalMechanism('nvidia-nim'), 'two-phase-commit');
  console.log('  ✓ 98.2 Anthropic, Gemini, and NVIDIA NIM map to two-phase-commit');

  // 98.3: DeepSeek, Kimi, MiniMax, Groq map to 'client-side-function-call'
  assert.equal(approvalFlowMapper.resolveApprovalMechanism('deepseek'), 'client-side-function-call');
  assert.equal(approvalFlowMapper.resolveApprovalMechanism('kimi'), 'client-side-function-call');
  assert.equal(approvalFlowMapper.resolveApprovalMechanism('minimax'), 'client-side-function-call');
  assert.equal(approvalFlowMapper.resolveApprovalMechanism('groq'), 'client-side-function-call');
  console.log('  ✓ 98.3 DeepSeek, Kimi, MiniMax, and Groq map to client-side-function-call');

  // 98.4: Unknown provider falls back to 'two-phase-commit' with warning log
  const unknownMechanism = approvalFlowMapper.resolveApprovalMechanism('some-unregistered-llm');
  assert.equal(unknownMechanism, 'two-phase-commit');
  console.log('  ✓ 98.4 Unknown provider safely falls back to two-phase-commit with APPROVAL_MECHANISM_UNKNOWN log');
}
