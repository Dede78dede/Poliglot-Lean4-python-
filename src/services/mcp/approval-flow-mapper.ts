/**
 * Approval Flow Mapper (Phase 10.10, Task A1)
 *
 * Maps Polyglot's two-phase commit confirm tier (proposalToken) to provider-specific
 * confirmation protocols:
 * - OpenAI: mcp_approval_request / mcp_approval_response (approve: bool)
 * - Anthropic / Gemini / NVIDIA NIM: two-phase-commit (proposalToken)
 * - DeepSeek / Kimi / MiniMax / Groq / OpenRouter: client-side-function-call
 * - Unknown providers fallback to two-phase-commit with APPROVAL_MECHANISM_UNKNOWN warning log
 */

import { StructuredLogger } from '../logging/logger';

export type ApprovalMechanism =
  | 'openai-mcp-approval'
  | 'two-phase-commit'
  | 'client-side-function-call';

export interface ApprovalProposal {
  readonly proposalToken: string;
  readonly toolName: string;
  readonly target: string;
  readonly diffOrProof: string;
  readonly createdAt: number;
}

export interface OpenAiApprovalRequest {
  readonly type: 'mcp_approval_request';
  readonly id: string;
  readonly tool_call: {
    readonly name: string;
    readonly arguments: Record<string, unknown>;
  };
  readonly proposalToken: string;
}

export interface OpenAiApprovalResponse {
  readonly type: 'mcp_approval_response';
  readonly approval_request_id: string;
  readonly approve: boolean;
  readonly proposalToken?: string;
}

export const APPROVAL_MAPPINGS: Record<string, ApprovalMechanism> = {
  openai: 'openai-mcp-approval',
  anthropic: 'two-phase-commit',
  gemini: 'two-phase-commit',
  'nvidia-nim': 'two-phase-commit',
  leanstral: 'two-phase-commit',
  deepseek: 'client-side-function-call',
  kimi: 'client-side-function-call',
  minimax: 'client-side-function-call',
  groq: 'client-side-function-call',
  openrouter: 'client-side-function-call',
  cerebras: 'client-side-function-call',
  mistral: 'client-side-function-call',
  axle: 'two-phase-commit',
  'no-ai': 'two-phase-commit',
};

const logger = new StructuredLogger('ApprovalFlowMapper');

export class ApprovalFlowMapper {
  /**
   * Resolves the approval protocol for the given provider.
   * If unknown, defaults to 'two-phase-commit' and logs warning.
   */
  public resolveApprovalMechanism(providerId: string): ApprovalMechanism {
    const mechanism = APPROVAL_MAPPINGS[providerId.toLowerCase()];
    if (mechanism) {
      return mechanism;
    }

    logger.warn(
      `APPROVAL_MECHANISM_UNKNOWN: Unknown AI provider "${providerId}"; defaulting to two-phase-commit approval mechanism.`,
      `appr-${Date.now()}`,
      { providerId, fallbackMechanism: 'two-phase-commit' }
    );

    return 'two-phase-commit';
  }

  /**
   * Formats an outgoing approval request for the target provider.
   */
  public formatApprovalRequest(providerId: string, proposal: ApprovalProposal): unknown {
    const mechanism = this.resolveApprovalMechanism(providerId);

    switch (mechanism) {
      case 'openai-mcp-approval': {
        const req: OpenAiApprovalRequest = {
          type: 'mcp_approval_request',
          id: `appr_${proposal.proposalToken}`,
          tool_call: {
            name: proposal.toolName,
            arguments: {
              target: proposal.target,
              diffOrProof: proposal.diffOrProof,
            },
          },
          proposalToken: proposal.proposalToken,
        };
        return req;
      }

      case 'client-side-function-call': {
        return {
          type: 'function_call_confirmation',
          function: proposal.toolName,
          arguments: {
            target: proposal.target,
            diffOrProof: proposal.diffOrProof,
            proposalToken: proposal.proposalToken,
          },
          requiresUserConsent: true,
        };
      }

      case 'two-phase-commit':
      default: {
        return {
          status: 'PENDING_CONFIRMATION',
          proposalToken: proposal.proposalToken,
          toolName: proposal.toolName,
          target: proposal.target,
          requiresConfirmation: true,
        };
      }
    }
  }

  /**
   * Verifies an incoming approval response from a client/agent.
   */
  public verifyApprovalResponse(
    providerId: string,
    response: unknown,
    expectedToken: string
  ): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const obj = response as Record<string, unknown>;
    const mechanism = this.resolveApprovalMechanism(providerId);

    switch (mechanism) {
      case 'openai-mcp-approval': {
        // OpenAI uses approve: boolean
        const approve = obj['approve'] === true;
        const tokenMatches = obj['proposalToken'] === expectedToken ||
          (typeof obj['approval_request_id'] === 'string' && obj['approval_request_id'].includes(expectedToken));
        return approve && (tokenMatches || obj['approval_request_id'] !== undefined);
      }

      case 'client-side-function-call': {
        const confirmed = obj['confirmed'] === true || obj['approve'] === true;
        const token = obj['proposalToken'] ?? obj['token'];
        return confirmed && token === expectedToken;
      }

      case 'two-phase-commit':
      default: {
        const token = obj['proposalToken'] ?? obj['token'];
        return token === expectedToken;
      }
    }
  }
}

export const approvalFlowMapper = new ApprovalFlowMapper();
