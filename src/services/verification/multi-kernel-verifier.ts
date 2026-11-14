/**
 * Multi-Kernel Verifier & Lake Check Paranoid Engine
 *
 * Implements Lean 4.35.0 multi-kernel soundness verification across 6 configurations:
 * 1. leanchecker (official C++ kernel without metaprogramming baggage, sandboxed)
 * 2. nanoda (Haskell-derived external checker)
 * 3. lean4lean (complete external typechecker written in Lean 4)
 * 4. con-leche (formally proven consistent Lean kernel, Carneiro set theory model)
 * 5. con-ron (AI-translated Rust version of con-leche, verified with Aeneas)
 * 6. leanchecker-hardened (official kernel variant with hardened memory allocator)
 *
 * Security Invariants:
 * - Sandbox is MANDATORY. Disabling sandbox via --inadvisably-no-sandbox is rejected.
 * - Any kernel disagreement causes immediate rejection with KERNEL_DISAGREEMENT.
 * - Defense in depth against CVE-2026-72844, compiler/runtime unsoundness, and memory corruption.
 */

import type { KernelVerificationCertificate, MultiKernelStatus } from '../../types/blueprint';
import { computeSha256 } from '../storage/hash-utils';

export const PARANOID_KERNELS = Object.freeze([
  'leanchecker',
  'nanoda',
  'lean4lean',
  'con-leche',
  'con-ron',
  'leanchecker-hardened',
] as const);

export type ParanoidKernelName = (typeof PARANOID_KERNELS)[number];

export interface MultiKernelVerificationOptions {
  readonly code: string;
  readonly toolchainVersion?: string;
  readonly timeoutMs?: number;
  readonly simulatedDisagreementKernel?: ParanoidKernelName;
  readonly inadvisablyNoSandbox?: boolean;
}

export interface MultiKernelVerificationResult {
  readonly success: boolean;
  readonly certificate?: KernelVerificationCertificate;
  readonly error?: {
    readonly code: 'KERNEL_DISAGREEMENT' | 'SORRY_REJECTED' | 'UNSUPPORTED_TOOLCHAIN' | 'SANDBOX_VIOLATION' | 'KERNEL_CHECK_FAILED';
    readonly message: string;
    readonly disagreements?: readonly string[];
    readonly failedKernels?: readonly string[];
  };
  readonly kernelStatuses: readonly MultiKernelStatus[];
}

export interface LakeCheckCommandOptions {
  readonly toolchain?: string;
  readonly toolchainVersion?: string;
  readonly paranoid?: boolean;
  readonly useSandbox?: boolean;
  readonly kernel?: ParanoidKernelName;
}

export interface VerifyMultiKernelArgs {
  readonly projectRoot?: string;
  readonly leanCode?: string;
  readonly code?: string;
  readonly toolchain?: string;
  readonly toolchainVersion?: string;
  readonly paranoid?: boolean;
  readonly useSandbox?: boolean;
  readonly simulateDisagreement?: boolean;
  readonly simulatedDisagreementKernel?: ParanoidKernelName;
  readonly timeoutMs?: number;
}

export interface VerifyMultiKernelOutput {
  readonly verified: boolean;
  readonly multiKernelStatus: 'consensus' | 'disagreement' | 'unavailable';
  readonly kernelsUsed: readonly ParanoidKernelName[];
  readonly paranoidCheckPassed: boolean;
  readonly cve2026_72844Status: 'not_affected' | 'fixed-by-version' | 'mitigated-by-paranoid-check' | 'patched' | 'not-applicable';
  readonly kernelDisagreements: readonly string[];
  readonly error?: string;
  readonly kernelStatuses: readonly MultiKernelStatus[];
  readonly certificate?: KernelVerificationCertificate;
}

export class MultiKernelVerifier {
  /**
   * Evaluates the CVE-2026-72844 status based on toolchain and verification method.
   */
  public getCveStatus(
    toolchain: string,
    paranoidPassed: boolean,
  ): 'not_affected' | 'fixed-by-version' | 'mitigated-by-paranoid-check' | 'not-applicable' {
    const isV435 = toolchain.includes('4.35');
    const isV433 = toolchain.includes('4.33');
    const isV432 = toolchain.includes('4.32.2');

    if (isV435 || isV433) {
      return 'not_affected';
    }
    if (isV432) {
      return 'fixed-by-version';
    }

    return paranoidPassed ? 'mitigated-by-paranoid-check' : 'not-applicable';
  }

  /**
   * Builds the lake check command with strict enforcement of the sandboxing policy.
   * Prohibits --inadvisably-no-sandbox.
   */
  public buildLakeCheckCommand(options: LakeCheckCommandOptions): string {
    if (options.useSandbox === false) {
      throw new Error(
        'SANDBOX_POLICY_VIOLATION: lake check sandbox must remain enabled. Disabling sandbox via --inadvisably-no-sandbox is strictly prohibited.',
      );
    }

    const baseCmd = 'lake check';
    if (options.paranoid) {
      return `${baseCmd} --paranoid`;
    }
    if (options.kernel) {
      return `${baseCmd} ${options.kernel}`;
    }
    return baseCmd;
  }

  /**
   * Fail-closed multi-kernel runner: client runtime cannot synthesize multi-kernel consensus locally.
   * Formal certification requires server-side /api/v1/lean/consensus execution.
   */
  public async verifyMultiKernel(args: VerifyMultiKernelArgs): Promise<VerifyMultiKernelOutput> {
    if (args.useSandbox === false) {
      throw new Error(
        'SANDBOX_POLICY_VIOLATION: lake check sandbox must remain enabled. Disabling sandbox via --inadvisably-no-sandbox is strictly prohibited.',
      );
    }

    const targetCode = args.leanCode || args.code || '';
    const toolchain = args.toolchain || args.toolchainVersion || 'v4.35.0';
    const simulatedDisagreement = args.simulateDisagreement
      ? args.simulatedDisagreementKernel || 'nanoda'
      : args.simulatedDisagreementKernel;

    const paranoidResult = await this.verifyParanoid({
      code: targetCode,
      toolchainVersion: toolchain,
      timeoutMs: args.timeoutMs,
      simulatedDisagreementKernel: simulatedDisagreement,
      inadvisablyNoSandbox: false,
    });

    const disagreements = paranoidResult.error?.disagreements ?? [];
    const status: VerifyMultiKernelOutput['multiKernelStatus'] =
      disagreements.length > 0 ? 'disagreement' : 'unavailable';

    return {
      verified: false,
      multiKernelStatus: status,
      kernelsUsed: [],
      paranoidCheckPassed: false,
      cve2026_72844Status: this.getCveStatus(toolchain, false),
      kernelDisagreements: disagreements,
      error:
        paranoidResult.error?.message ||
        'MULTI_KERNEL_UNAVAILABLE: Local multi-kernel simulation cannot certify proofs; invoke server dual-engine consensus.',
      kernelStatuses: paranoidResult.kernelStatuses,
    };
  }

  /**
   * Prohibited client-side seal minting path: server hybrid-adjudicator owns certification.
   */
  public async computeDeclarationDigest(theoremStatement: string, proofContent: string, toolchain: string): Promise<string> {
    return computeSha256(`${theoremStatement}\n${proofContent}\n${toolchain}`);
  }

  public generateExtendedCertificate(): never {
    throw new Error(
      'CERTIFICATION_AUTHORITY_DENIED: Client MultiKernelVerifier cannot mint Tier-5 certificates without server dual-engine consensus.',
    );
  }

  /**
   * Fail-closed pre-check: validates sandbox, sorry-ban, and toolchain gates locally,
   * then reports KERNEL_CHECK_FAILED until genuine server runners execute.
   */
  public async verifyParanoid(
    options: MultiKernelVerificationOptions,
  ): Promise<MultiKernelVerificationResult> {
    const {
      code,
      toolchainVersion = 'v4.35.0',
      simulatedDisagreementKernel,
      inadvisablyNoSandbox = false,
    } = options;

    if (inadvisablyNoSandbox) {
      return {
        success: false,
        error: {
          code: 'SANDBOX_VIOLATION',
          message: 'Security policy violation: lake check sandbox must remain enabled. Disabling sandbox is strictly prohibited.',
        },
        kernelStatuses: [],
      };
    }

    if (/\b(sorry|admit)\b/.test(code)) {
      return {
        success: false,
        error: {
          code: 'SORRY_REJECTED',
          message: 'Formal verification failed: code contains unproven sorry or admit declarations.',
        },
        kernelStatuses: [],
      };
    }

    const isToolchain435 = toolchainVersion.startsWith('v4.35') || toolchainVersion.includes('4.35.0');
    if (!isToolchain435 && !toolchainVersion.includes('4.32.2')) {
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_TOOLCHAIN',
          message: `lake check --paranoid requires Lean v4.35.0. Current toolchain: ${toolchainVersion}.`,
        },
        kernelStatuses: [],
      };
    }

    if (simulatedDisagreementKernel) {
      return {
        success: false,
        error: {
          code: 'KERNEL_DISAGREEMENT',
          message: `KERNEL_DISAGREEMENT: Simulated disagreement triggered on kernel ${simulatedDisagreementKernel}.`,
          disagreements: [simulatedDisagreementKernel],
        },
        kernelStatuses: PARANOID_KERNELS.map((kernel) => ({
          kernelName: kernel,
          status: kernel === simulatedDisagreementKernel ? 'failed' : 'skipped',
          language:
            kernel === 'nanoda'
              ? 'haskell'
              : kernel === 'lean4lean' || kernel === 'con-leche'
                ? 'lean4'
                : kernel === 'con-ron'
                  ? 'rust'
                  : 'cpp',
          executionTimeMs: 0,
          details:
            kernel === simulatedDisagreementKernel
              ? `Simulated divergence detected in kernel ${kernel}`
              : 'Server kernel execution not invoked in client runtime.',
        })),
      };
    }

    return {
      success: false,
      error: {
        code: 'KERNEL_CHECK_FAILED',
        message: 'Local multi-kernel binary execution unavailable in browser/unconnected mode; server consensus required.',
      },
      kernelStatuses: PARANOID_KERNELS.map((kernel) => ({
        kernelName: kernel,
        status: 'skipped',
        language:
          kernel === 'nanoda'
            ? 'haskell'
            : kernel === 'lean4lean' || kernel === 'con-leche'
              ? 'lean4'
              : kernel === 'con-ron'
                ? 'rust'
                : 'cpp',
        executionTimeMs: 0,
        details: 'Requires live server-side kernel runner execution.',
      })),
    };
  }
}

export const multiKernelVerifier = new MultiKernelVerifier();
