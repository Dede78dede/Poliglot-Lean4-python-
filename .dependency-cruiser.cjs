/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are strictly forbidden across the codebase.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'domain-to-presentation',
      severity: 'error',
      comment: 'Core domain services and types must not import presentation components.',
      from: {
        path: '^(src/types|src/services/verification|server/src/services/verification)',
      },
      to: {
        path: '^(src/components|src/shared/ui)',
      },
    },
    {
      name: 'domain-to-infrastructure',
      severity: 'error',
      comment: 'Pure verification domain modules must not import heavy infrastructure/server libraries directly.',
      from: {
        path: '^(src/types|src/services/verification/verification-formula)',
      },
      to: {
        path: '(express|axios|pg|mongodb)',
      },
    },
    {
      name: 'epistemic-authority-isolation',
      severity: 'error',
      comment: 'Only hybrid-adjudicator and proof-outcome types may reference verification seals.',
      from: {
        pathNot: '^(server/src/services/verification/hybrid-adjudicator|server/src/types/proof-outcome|src/types/proof-outcome|src/contracts|tests/)',
      },
      to: {
        path: 'server/src/types/proof-outcome\\.ts$',
      },
    },
    {
      name: 'no-tools-in-production',
      severity: 'error',
      comment: 'Production and runtime code (src/ and server/src/) must never import developer tooling from tools/.',
      from: {
        path: '^(src|server/src)',
      },
      to: {
        path: '^tools',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
