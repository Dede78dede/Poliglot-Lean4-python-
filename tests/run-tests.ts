import {
  LeanExecuteRequestSchema,
  LeanExecuteResponseSchema,
  ProblemDetailsSchema,
} from '../src/types/contracts';
import {
  LEAN_GUIDED_STEPS,
  PYTHON_GUIDED_STEPS,
  FULL_GALLERY_EXAMPLES,
  CodeExampleSchema,
} from '../src/examples/example-registry';
import { KiminaSimulator } from '../server/src/services/kimina-simulator';
import { resolveKiminaConfig } from '../server/src/config/kimina-config';

let passes = 0;
let fails = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passes++;
    console.log(`  ✓ ${msg}`);
  } else {
    fails++;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('--- Testing Contracts & Verification Semantics ---');
const validReq = LeanExecuteRequestSchema.safeParse({ code: 'example : True := trivial', timeoutMs: 5000 });
assert(validReq.success, 'Valid LeanExecuteRequest succeeds');

const invalidReq = LeanExecuteRequestSchema.safeParse({ code: '', timeoutMs: 5000 });
assert(!invalidReq.success, 'Empty code is rejected by Zod');

const verifiedResp = LeanExecuteResponseSchema.safeParse({
  stdout: 'No goals',
  stderr: '',
  exitCode: 0,
  durationMs: 15,
  verified: true,
  simulated: false,
});
assert(verifiedResp.success && verifiedResp.data.verified === true, 'Strict verified: true contract accepted');

const simulatedResp = LeanExecuteResponseSchema.safeParse({
  stdout: '⚠ SIMULATED',
  stderr: '',
  exitCode: 0,
  durationMs: 12,
  verified: false,
  simulated: true,
});
assert(simulatedResp.success && simulatedResp.data.verified === false, 'Simulated responses enforce verified: false');

const problemDetails = ProblemDetailsSchema.safeParse({
  type: 'https://polyglot.dev/errors/test',
  title: 'Test',
  status: 400,
  detail: 'Detail',
});
assert(problemDetails.success, 'RFC 9457 ProblemDetails schema matches');

console.log('\n--- Testing Example Registry Integrity ---');
assert(LEAN_GUIDED_STEPS.length === 7, '7 Lean guided steps registered');
for (const step of LEAN_GUIDED_STEPS) {
  const p = CodeExampleSchema.safeParse(step);
  assert(p.success && step.solution !== undefined, `Lean step "${step.title}" valid with solution`);
}

assert(PYTHON_GUIDED_STEPS.length === 6, '6 Python guided steps registered');
for (const step of PYTHON_GUIDED_STEPS) {
  const p = CodeExampleSchema.safeParse(step);
  assert(p.success, `Python step "${step.title}" valid`);
}

console.log('\n--- Testing Kimina Simulator & Production Guards ---');
const sim = new KiminaSimulator();
const checkRes = sim.verify('#check Nat');
assert(checkRes.simulated === true && checkRes.verified === false, 'Simulator marks verified: false on #check');
assert(checkRes.stdout.includes('⚠ SIMULATED'), 'Simulator prepends warning on #check');

const sorryRes = sim.verify('theorem t : True := by sorry');
assert(sorryRes.stdout.includes("declaration uses 'sorry'"), 'Simulator identifies sorry declaration');

let prodThrows = false;
try {
  resolveKiminaConfig({ NODE_ENV: 'production', KIMINA_MODE: 'simulator' });
} catch {
  prodThrows = true;
}
assert(prodThrows, 'Production guard forbids simulator mode');

console.log(`\nResults: ${passes} passed, ${fails} failed.`);
if (fails > 0) process.exit(1);
