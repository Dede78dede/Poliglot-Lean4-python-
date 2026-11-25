import { describe, it } from 'vitest';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { runSuite106 } from '../phase-11.0.1/suite-106-file-manager.test';
import { runSuite107 } from '../phase-11.0.1/suite-107-registries.test';
import { runSuite108 } from '../phase-11.0.1/suite-108-docs.test';
import { runSuite109 } from '../phase-11.0.2/suite-109-chat.test';
import { runSuite110 } from '../phase-11.0.2/suite-110-settings.test';
import { runSuite111 } from '../phase-11.0.2/suite-111-automation.test';
import { runSuite112 } from '../phase-11.0.2/suite-112-registries.test';
import { runSuite113 } from '../phase-11.0.2/suite-113-docs.test';
import { runSuite114 } from '../phase-11.1/suite-114-installation.test';
import { runSuite115 } from '../phase-11.1/suite-115-client.test';
import { runSuite116 } from '../phase-11.1/suite-116-mcp-tools.test';
import { runSuite117 } from '../phase-11.1/suite-117-chat-probe.test';
import { runSuite118 } from '../phase-11.1/suite-118-skills.test';
import { runSuite120 } from '../phase-11.1/suite-120-docs.test';
import { runSuite121 } from '../phase-11.1/suite-121-mobile.test';
import { runSuite122 } from '../phase-11.1/suite-122-context-engine.test';
import { runSuite123 } from '../phase-11.2/suite-123-archive-format.test';
import { runSuite124 } from '../phase-11.2/suite-124-archive-safety.test';
import { runSuite125 } from '../phase-11.2/suite-125-paperproof.test';
import { runSuite126 } from '../phase-11.2/suite-126-otel-core.test';
import { runSuite127 } from '../phase-11.2/suite-127-trace-correlation.test';
import { runSuite128 } from '../phase-11.2/suite-128-mathesis-provider.test';
import { runSuite129 } from '../phase-11.2/suite-129-mathesis-router.test';
import { runSuite130 } from '../phase-11.2/suite-130-yjs-crdt.test';
import { runSuite131 } from '../phase-11.2/suite-131-yjs-persistence.test';
import { runSuite132 } from '../phase-11.2/suite-132-yjs-lazy-load.test';
import { runSuite133 } from '../phase-11.2/suite-133-integration.test';

async function runSuite125Isolated(): Promise<void> {
  featureFlagRegistry.set('ENABLE_PAPERPROOF', true);
  featureFlagRegistry.set('ENABLE_PAPERPROOF_PLAYBACK', true);
  try {
    await runSuite125();
  } finally {
    featureFlagRegistry.reset('ENABLE_PAPERPROOF');
    featureFlagRegistry.reset('ENABLE_PAPERPROOF_PLAYBACK');
  }
}

describe('Feature Suites (106-133) in Vitest', () => {
  const suites: ReadonlyArray<[number, () => Promise<void>]> = [
    [106, runSuite106],
    [107, runSuite107],
    [108, runSuite108],
    [109, runSuite109],
    [110, runSuite110],
    [111, runSuite111],
    [112, runSuite112],
    [113, runSuite113],
    [114, runSuite114],
    [115, runSuite115],
    [116, runSuite116],
    [117, runSuite117],
    [118, runSuite118],
    [120, runSuite120],
    [121, runSuite121],
    [122, runSuite122],
    [123, runSuite123],
    [124, runSuite124],
    [125, runSuite125Isolated],
    [126, runSuite126],
    [127, runSuite127],
    [128, runSuite128],
    [129, runSuite129],
    [130, runSuite130],
    [131, runSuite131],
    [132, runSuite132],
    [133, runSuite133],
  ];

  for (const [id, fn] of suites) {
    it(`executes Suite ${id}`, async () => {
      await fn();
    });
  }
});
