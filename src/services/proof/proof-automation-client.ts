import type {
  ProofAutomationRequest,
  ProofAutomationResult,
  AxleDisproveResult,
  AxleExtractStatesResult,
  AxleSimplifyResult,
  BlueprintSyncRequest,
  BlueprintSyncResult,
} from '../../types/proof-automation';

export class ProofAutomationClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Triggers the multi-tier Auto-Prove fallback chain (Duper → aesop → Pantograph)
   */
  public async autoProve(request: ProofAutomationRequest): Promise<ProofAutomationResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/proof/duper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 503 && errData.error === 'DUPER_DISABLED') {
        // Fallback or explain feature flag
        return {
          proved: false,
          durationMs: 0,
          kernelVerified: false,
          stepsEvaluated: 1,
          chainLog: [
            {
              tier: 'duper',
              status: 'skipped',
              durationMs: 0,
              reason: 'Duper disabled by feature flag ENABLE_DUPER=false. Set ENABLE_DUPER=true to enable.',
            },
          ],
          error: 'DUPER_DISABLED: Set ENABLE_DUPER=true in .env or server config to activate superposition prover.',
        };
      }
      throw new Error(errData.message || `Proof automation failed with status ${res.status}`);
    }

    return (await res.json()) as ProofAutomationResult;
  }

  /**
   * AXLE Cloud Metaprogramming: Disprove a statement or conjecture
   */
  public async disprove(statement: string, consentGiven: boolean): Promise<AxleDisproveResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/proof/disprove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statement, consentGiven }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.message || `AXLE disprove failed: ${res.status}`);
      (err as any).code = errData.error;
      (err as any).status = res.status;
      throw err;
    }

    return (await res.json()) as AxleDisproveResult;
  }

  /**
   * AXLE Cloud Metaprogramming: Extract intermediate proof states per line
   */
  public async extractProofStates(code: string, consentGiven: boolean): Promise<AxleExtractStatesResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/proof/extract-states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, consentGiven }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.message || `AXLE extract states failed: ${res.status}`);
      (err as any).code = errData.error;
      (err as any).status = res.status;
      throw err;
    }

    return (await res.json()) as AxleExtractStatesResult;
  }

  /**
   * AXLE Cloud Metaprogramming: Simplify proof and remove redundant tactics
   */
  public async simplifyProof(code: string, consentGiven: boolean): Promise<AxleSimplifyResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/proof/simplify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, consentGiven }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.message || `AXLE simplify failed: ${res.status}`);
      (err as any).code = errData.error;
      (err as any).status = res.status;
      throw err;
    }

    return (await res.json()) as AxleSimplifyResult;
  }

  /**
   * Blueprint Synchronization: Reconciles DAG and source code (extract, reconcile, push)
   */
  public async syncBlueprint(
    workspaceId: string,
    request: BlueprintSyncRequest
  ): Promise<BlueprintSyncResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/proof/blueprint/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, ...request }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Blueprint sync failed: ${res.status}`);
    }

    return (await res.json()) as BlueprintSyncResult;
  }
}

export const proofAutomationClient = new ProofAutomationClient();
