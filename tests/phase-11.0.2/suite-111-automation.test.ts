/**
 * Test Suite 111: Automations, Auto-Archive, RO-Crate & Scaffolding (Sprint 11.0.2, Task A5)
 */

import assert from 'node:assert/strict';
import * as fflate from 'fflate';
import { autoArchiveService } from '../../src/services/automation/auto-archive';
import { createProjectExportBundle } from '../../src/services/automation/project-export-bundle';
import { SCAFFOLD_TEMPLATES } from '../../src/services/automation/scaffold-templates';
import { scheduledWorkflowsService } from '../../src/services/automation/scheduled-workflows';

export async function runSuite111(): Promise<void> {
  console.log('\n--- Test Suite 111: Automations, Auto-Archive, RO-Crate & Scaffolding ---');

  // 111.1: Auto-archive proposes an archive excluding build and transient paths
  const testFiles = [
    'src/main.py',
    'src/util.py',
    '.lake/build/ir/Math.olean',
    '__pycache__/main.cpython-314.pyc',
    'node_modules/vite/package.json',
    '.git/config',
    '.trash/deleted.txt',
    'lakefile.toml',
  ];
  const eligible = autoArchiveService.filterArchiveFiles(testFiles);
  assert.equal(eligible.length, 3);
  assert.ok(eligible.includes('src/main.py'));
  assert.ok(eligible.includes('src/util.py'));
  assert.ok(eligible.includes('lakefile.toml'));

  const proposal = autoArchiveService.proposeArchive(testFiles);
  assert.ok(proposal);
  assert.equal(proposal.fileCount, 3);
  assert.equal(proposal.status, 'pending');

  autoArchiveService.acceptProposal();
  assert.equal(autoArchiveService.getSnapshot().activeProposal, null);
  assert.ok(autoArchiveService.getSnapshot().lastArchivedAt !== null);
  console.log('  ✓ 111.1 Auto-archive proposes an archive after configured idle period');

  // 111.2: Project export bundle contains all expected files and a valid RO-Crate manifest.json
  const bundle = await createProjectExportBundle({
    projectId: 'test-project-111',
    projectName: 'Verified Analysis Library',
    vfsFiles: {
      'src/algo.py': 'def run(): return 42\n',
      'Proof.lean': 'theorem t : True := trivial\n',
      '.lake/artifact.olean': 'binary data to exclude\n',
    },
    settings: { fontSize: 14 },
    flags: { ENABLE_LLM_CHAT: true },
    auditLog: [{ event: 'verified' }],
    bibliography: [{ title: 'Formal Mathematics in Lean 4' }],
    blueprintDag: { nodes: 1 },
  });

  assert.ok(bundle.sizeBytes > 0);
  assert.equal(bundle.sha256.length, 64);
  assert.ok(bundle.manifestJson.includes('https://w3id.org/ro/crate/1.1/context'));
  assert.ok(bundle.manifestJson.includes('Verified Analysis Library'));

  const unzipped = fflate.unzipSync(bundle.zipBytes);
  assert.ok(unzipped['vfs/src/algo.py']);
  assert.ok(unzipped['vfs/Proof.lean']);
  assert.ok(!unzipped['vfs/.lake/artifact.olean'], '.lake build artifacts must be strictly excluded');
  assert.ok(unzipped['meta/settings.json']);
  assert.ok(unzipped['meta/feature-flags.json']);
  assert.ok(unzipped['meta/audit-log.json']);
  assert.ok(unzipped['meta/bibliography.json']);
  assert.ok(unzipped['meta/blueprint-dag.json']);
  assert.ok(unzipped['manifest.json']);
  assert.ok(unzipped['ro-crate-metadata.json']);
  console.log('  ✓ 111.2 Project export bundle contains all expected files and valid RO-Crate manifest');

  // 111.3: New Project wizard creates a working project from each template
  assert.equal(SCAFFOLD_TEMPLATES.length, 8);
  for (const tpl of SCAFFOLD_TEMPLATES) {
    assert.ok(tpl.id.length > 0);
    assert.ok(tpl.name.length > 0);
    assert.ok(Object.keys(tpl.files).length >= 3);
    assert.ok(
      tpl.files['README.md'] !== undefined,
      `Template ${tpl.id} missing README.md`
    );
    assert.ok(
      tpl.files['ro-crate-metadata.json'] !== undefined,
      `Template ${tpl.id} missing ro-crate-metadata.json`
    );
    assert.ok(
      tpl.files['pyproject.toml'] !== undefined || tpl.files['lakefile.toml'] !== undefined,
      `Template ${tpl.id} must define project manifest`
    );
  }
  console.log('  ✓ 111.3 New Project wizard creates a working project from each template');

  // 111.4: Nightly proof check runs and reports results
  scheduledWorkflowsService.enableWorkflow('nightly-proof-check');
  const checkRes = await scheduledWorkflowsService.runNightlyProofCheck();
  assert.equal(checkRes.success, true);
  assert.ok(checkRes.report.includes('Lake build'));
  const wf = scheduledWorkflowsService.getSnapshot().workflows.find((w) => w.id === 'nightly-proof-check');
  assert.equal(wf?.lastStatus, 'success');
  console.log('  ✓ 111.4 Nightly proof check runs and reports results');

  // 111.5: Weekly archive keeps only the 4 most recent archives
  for (let i = 0; i < 7; i++) {
    scheduledWorkflowsService.runWeeklyArchive(1000 + i);
  }
  const archives = scheduledWorkflowsService.getSnapshot().recentArchives;
  assert.equal(archives.length, 4, `Strict retention limit of 4 archives; got ${archives.length}`);
  console.log('  ✓ 111.5 Weekly archive keeps strictly the 4 most recent archives');
}
