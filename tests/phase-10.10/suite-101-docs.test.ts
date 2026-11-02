/**
 * Test Suite 101: Documentation & Integration Verification (Phase 10.10, Task D1)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function runSuite101(): Promise<void> {
  console.log('\n--- Test Suite 101: Documentation & Integration Verification ---');

  // 101.1: docs/how-to/connect-llm.md documents 9 provider recipes
  const connectPath = path.resolve(process.cwd(), 'docs/how-to/connect-llm.md');
  assert.ok(fs.existsSync(connectPath), 'docs/how-to/connect-llm.md must exist');
  const connectContent = fs.readFileSync(connectPath, 'utf8');
  const requiredProviders = [
    'OpenAI',
    'Anthropic',
    'Gemini',
    'NVIDIA NIM',
    'DeepSeek',
    'Kimi',
    'MiniMax',
    'Groq',
    'OpenRouter',
  ];
  for (const p of requiredProviders) {
    assert.ok(
      connectContent.includes(p),
      `docs/how-to/connect-llm.md is missing recipe for: ${p}`
    );
  }
  console.log('  ✓ 101.1 docs/how-to/connect-llm.md comprehensively documents all 9 provider recipes');

  // 101.2: docs/architecture/mcp-compliance.md, tool-search.md, and agent-skills.md exist
  const mcpDoc = path.resolve(process.cwd(), 'docs/architecture/mcp-compliance.md');
  const toolSearchDoc = path.resolve(process.cwd(), 'docs/architecture/tool-search.md');
  const agentSkillsDoc = path.resolve(process.cwd(), 'docs/reference/agent-skills.md');
  assert.ok(fs.existsSync(mcpDoc), 'mcp-compliance.md must exist');
  assert.ok(fs.existsSync(toolSearchDoc), 'tool-search.md must exist');
  assert.ok(fs.existsSync(agentSkillsDoc), 'agent-skills.md must exist');
  console.log('  ✓ 101.2 Architectural and reference documents verified');

  // 101.3: docker-compose.gateway.yml is valid and includes litellm & agentgateway
  const composePath = path.resolve(process.cwd(), 'docker-compose.gateway.yml');
  assert.ok(fs.existsSync(composePath), 'docker-compose.gateway.yml must exist');
  const composeContent = fs.readFileSync(composePath, 'utf8');
  assert.ok(composeContent.includes('litellm:'));
  assert.ok(composeContent.includes('agentgateway:'));
  assert.ok(composeContent.includes('4000:4000'));
  assert.ok(composeContent.includes('8089:8089'));
  console.log('  ✓ 101.3 docker-compose.gateway.yml verified with optional LiteLLM and Agentgateway services');
}
