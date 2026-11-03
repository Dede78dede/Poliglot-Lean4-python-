/**
 * CLI Tool for Token Vault Management (Phase 13.9, Task 03)
 */

import { tokenVault } from '../src/services/auth/token-vault';

function main(): void {
  const args = process.argv.slice(2);
  const action = args[0];
  const targetId = args[1];

  if (action === 'rotate') {
    const id = targetId ?? 'default-dev';
    const result = tokenVault.rotateToken(id);
    console.log(`[Token Vault] Token ${id} rotated successfully.`);
    console.log(`  New ID: ${result.id}`);
    console.log(`  Raw Secret: ${result.newRawToken}`);
    console.log('  WARNING: Store this secret securely; it cannot be retrieved again.');
  } else if (action === 'revoke') {
    if (!targetId) {
      console.error('Usage: tsx scripts/tokens-cli.ts revoke <token-id>');
      process.exit(1);
    }
    const success = tokenVault.revokeToken(targetId);
    if (success) {
      console.log(`[Token Vault] Token ${targetId} revoked successfully.`);
    } else {
      console.error(`[Token Vault] Token ${targetId} not found.`);
      process.exit(1);
    }
  } else if (action === 'list') {
    const list = tokenVault.listTokens();
    console.log('[Token Vault] Stored Tokens:');
    for (const t of list) {
      console.log(`  - ${t.id} (${t.name}) [${t.revokedAt ? 'REVOKED' : 'ACTIVE'}]`);
    }
  } else {
    console.log('Usage: tsx scripts/tokens-cli.ts [rotate [id] | revoke <id> | list]');
  }
}

main();
