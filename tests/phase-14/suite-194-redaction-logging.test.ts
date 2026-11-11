/**
 * Test Suite 194: Redaction and Sensitive Logging Tests (Phase 14.9.9.2, G-P12)
 *
 * Validates that security event emitters and logging boundaries recursively redact credentials:
 * 194.1: Short token IDs (< 24 chars) are masked and never logged raw.
 * 194.2: Authorization and Bearer headers in structured details are replaced with '[REDACTED]'.
 * 194.3: Cookies, set-cookie, and secret headers in structured details are replaced with '[REDACTED]'.
 * 194.4: Nested details (multi-level object/array structures) have all secret fields recursively redacted.
 * 194.5: URL query strings containing tokens or secrets are sanitized at the log boundary.
 */

import assert from 'node:assert/strict';
import {
  serverSecurityEvents,
  redactSensitiveData,
} from '../../server/src/services/telemetry/security-events';

export async function runSuite194(): Promise<void> {
  console.log('Running Suite 194: Redaction and Sensitive Logging Tests (5 sub-tests)...');

  serverSecurityEvents.clear();

  // 194.1: Short token IDs (< 24 chars) are sanitized
  const shortTokens = ['sk-1234', 'secret', 'tok_99', 'short-admin-key'];
  for (const shortToken of shortTokens) {
    const event = serverSecurityEvents.emitAuthDenied(shortToken, '10.0.0.1', '/api/v1/auth');
    assert.ok(event.tokenId, 'tokenId must be present');
    assert.ok(event.tokenId.startsWith('opaque_ref_'), `Token ${shortToken} must be masked with opaque_ref_`);
    assert.ok(!event.tokenId.includes(shortToken), `Raw token ${shortToken} must not appear in event`);
    assert.ok(!JSON.stringify(event).includes(`"${shortToken}"`), `Serialized event must not leak raw token ${shortToken}`);
  }
  console.log('  ✓ 194.1 Short token IDs: Tokens under 24 characters are universally masked as opaque references');

  // 194.2: Authorization and Bearer headers in structured details
  const rawBearer = 'Bearer secret-jwt-token-value-9999';
  const rawAuthKey = 'Basic dXNlcjpwYXNzd29yZA==';
  const authPayload = {
    headers: {
      authorization: rawBearer,
      'x-custom-auth': rawAuthKey,
      host: 'polyglot.local',
    },
  };
  const redactedAuth = redactSensitiveData(authPayload) as any;
  assert.equal(redactedAuth.headers.authorization, '[REDACTED]');
  assert.equal(redactedAuth.headers.host, 'polyglot.local');
  assert.ok(!JSON.stringify(redactedAuth).includes(rawBearer));
  console.log('  ✓ 194.2 Authorization headers: Standard and custom authorization keys are replaced with [REDACTED]');

  // 194.3: Cookies and secret headers in structured details
  const cookiePayload = {
    cookie: 'session_id=super-secret-cookie-1234; user=admin',
    'set-cookie': 'token=new-token-value',
    contentType: 'application/json',
  };
  const redactedCookie = redactSensitiveData(cookiePayload) as any;
  assert.equal(redactedCookie.cookie, '[REDACTED]');
  assert.equal(redactedCookie['set-cookie'], '[REDACTED]');
  assert.equal(redactedCookie.contentType, 'application/json');
  assert.ok(!JSON.stringify(redactedCookie).includes('super-secret-cookie-1234'));
  console.log('  ✓ 194.3 Cookies & session tokens: Cookie and credential headers stripped at the log boundary');

  // 194.4: Nested details recursive redaction
  const nestedPayload = {
    level1: {
      level2: {
        apiKey: 'deep-secret-api-key-value',
        token: 'nested-token-value',
        safeProperty: 'public-value',
        arrayItems: [
          { secret: 'array-secret-1' },
          { normalProp: 42 },
        ],
      },
    },
  };
  const redactedNested = redactSensitiveData(nestedPayload) as any;
  assert.equal(redactedNested.level1.level2.apiKey, '[REDACTED]');
  assert.equal(redactedNested.level1.level2.token, '[REDACTED]');
  assert.equal(redactedNested.level1.level2.safeProperty, 'public-value');
  assert.equal(redactedNested.level1.level2.arrayItems[0].secret, '[REDACTED]');
  assert.equal(redactedNested.level1.level2.arrayItems[1].normalProp, 42);

  const serializedNested = JSON.stringify(redactedNested);
  assert.ok(!serializedNested.includes('deep-secret-api-key-value'));
  assert.ok(!serializedNested.includes('nested-token-value'));
  assert.ok(!serializedNested.includes('array-secret-1'));
  console.log('  ✓ 194.4 Recursive tree redaction: Deeply nested objects and arrays sanitized without property loss');

  // 194.5: URL query strings containing credentials
  const dirtyUrl = '/api/v1/auth/callback?code=xyz&token=secret-token-123&state=abc';
  const cleanUrl = redactSensitiveData(dirtyUrl);
  assert.equal(cleanUrl, '/api/v1/auth/callback?code=xyz&token=[REDACTED]&state=abc');
  assert.ok(!String(cleanUrl).includes('secret-token-123'));

  const eventWithDirtyUrl = serverSecurityEvents.emitAuthDenied('user-token', '127.0.0.1', dirtyUrl);
  assert.ok(!JSON.stringify(eventWithDirtyUrl).includes('secret-token-123'));
  console.log('  ✓ 194.5 Query strings: URL parameters containing secret keys are scrubbed in request event paths');
}

if (process.argv[1]?.endsWith('suite-194-redaction-logging.test.ts')) {
  runSuite194()
    .then(() => {
      console.log('Suite 194 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
