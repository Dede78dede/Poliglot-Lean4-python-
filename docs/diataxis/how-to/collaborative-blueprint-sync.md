# How-To Guide: Reconciling Drift and Syncing Blueprint DAGs

This guide shows you how to detect architectural discrepancies between your active Lean 4 source buffer and the collaborative Archon Horizon blueprint DAG, claim nodes atomically, and generate missing stubs without overwriting verified work.

---

## Scenario
You are working on a multi-mathematician formalization project (e.g., Liquid Tensor Experiment). Other contributors have added nodes to the dependency graph, and your local buffer has drifted from the upstream schema.

---

## 1. Inspecting Architectural Drift

1. Open the **Proof Automation Panel** (click the **Sparkles** icon or press `Ctrl+Shift+P` and search `Proof Automation`).
2. Select the **Blueprint Sync** tab.
3. Keep the mode selected on **Reconcile Drift**.
4. Click **Execute Sync**.

### Reading the Discrepancy Report
- **`added`**: A node exists in the DAG that is missing from your active source buffer.
- **`missing`**: A declaration was deleted locally but is still required by dependencies.
- **`signature_drift`**: The theorem parameters, types, or target goal have changed upstream.

---

## 2. Generating Missing Formal Stubs

To inject stubs for all unproven nodes without modifying existing proofs:
1. In the **Blueprint Sync** tab, select **Generate Lean Stubs**.
2. Notice the sync engine automatically skips all nodes marked **frozen** or **verified**.
3. Click **Execute Sync**.
4. Review the generated stubs in the code preview box.
5. Click **Append Stubs to Buffer**.

---

## 3. Claiming a Node for Exclusive Authoring

To prevent concurrent theorem collision:
1. Open the Blueprint DAG viewer dock.
2. Click on the target unverified node (e.g. `Thm_Coboundary_Exact`).
3. Click **Claim Node**.
4. The system grants a time-limited lease (default: 300,000ms / 5 minutes) tracked monotonically in the cryptographic ledger.
5. If another collaborator attempts to claim the same node simultaneously, the server returns an explicit `HTTP 409 Conflict: Node is currently leased`.

---

## 4. Releasing or Sealing the Node

- **Upon completion**: When the Lean kernel successfully verifies the theorem (zero sorry), the node is automatically sealed with a cryptographic 5-term certificate and becomes immutable.
- **Manual release**: If you wish to yield the claim without completing the proof, click **Release Claim** to return the node to the shared open pool.
