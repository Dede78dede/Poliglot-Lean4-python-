# Self-Hosted Deployment Guide (Polyglot Code Studio)

## 1. Overview & Architecture

Polyglot Code Studio is architected for self-hosted deployment on dedicated hardware or cloud VMs (Ubuntu 22.04+ / Debian 12 recommended).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Self-Hosted Docker Network                      │
│                                                                        │
│   [ Client Browser ]                                                   │
│           │                                                            │
│   HTTP:3000 / HTTPS:443                                                │
│           ▼                                                            │
│   ┌──────────────────┐                                                 │
│   │ polyglot-studio  │ (Node.js 22 + Express + Vite)                   │
│   └────────┬─────────┘                                                 │
│            │ (internal network)                                        │
│     ┌──────┴─────────────────────────┐                                 │
│     ▼                                ▼                                 │
│ ┌──────────────────────┐   ┌──────────────────────┐                    │
│ │ kimina-lean-runner   │   │ pantograph-runner    │                    │
│ │ (--internal=true)    │   │ (--internal=true)    │                    │
│ └──────────┬───────────┘   └──────────┬───────────┘                    │
│            │                          │                                │
│            ▼                          ▼ (:ro)                          │
│     ┌──────────────────────────────────────────────┐                   │
│     │   Shared Volume: /root/.cache/mathlib (~20 GB)│                   │
│     └──────────────────────────────────────────────┘                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Docker Compose Configuration (`docker-compose.yml`)

```yaml
version: '3.9'

networks:
  polyglot-net:
    driver: bridge
  lean-isolated-net:
    driver: bridge
    internal: true # STRICT NO-RUNTIME-NETWORK ISOLATION

volumes:
  mathlib-cache:
    driver: local

services:
  studio:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LEAN_RUNNER_MODE=real
      - LEAN_RUNNER_URL=http://lean-runner:8080
      - KIMINA_URL=http://kimina-backend:8080
      - PIPELINE_STRICT_GOALS=false # Set to true for 6-term verification
    networks:
      - polyglot-net
    depends_on:
      - lean-runner

  lean-runner:
    image: polyglot/lean-runner:v1.1
    build:
      context: ./docker/lean-runner
      dockerfile: Dockerfile
    networks:
      - polyglot-net
      - lean-isolated-net
    volumes:
      - mathlib-cache:/root/.cache/mathlib
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 16G
        reservations:
          cpus: '2.0'
          memory: 8G

  pantograph:
    image: polyglot/pantograph:v0.3.19
    networks:
      - polyglot-net
      - lean-isolated-net
    volumes:
      # Read-only mount prevents concurrent cache corruption
      - mathlib-cache:/root/.cache/mathlib:ro
    environment:
      - LEAN_TOOLCHAIN=leanprover/lean4:v4.33.1
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 8G
```

---

## 3. Strict Runtime Isolation (`--internal=true`)

To guarantee reproducible, hermetic formal proofs and eliminate external supply-chain vulnerabilities, mathematical build containers run with:
- `--internal=true` (Docker internal bridge: **strictly no outbound Internet access at runtime**).
- All toolchains are pre-baked at image build time:
  - `leanprover/lean4:v4.28.0`
  - `leanprover/lean4:v4.31.0`
  - `leanprover/lean4:v4.33.1` (Pantograph v0.3.19 compatible)
  - `leanprover/lean4:v4.35.0-rc4` (Mathlib v4.35.0-rc3 & ProofWidgets v0.0.113 compatible)
- If a project requests an uninstalled toolchain, the runner returns HTTP 409 `{ error: 'TOOLCHAIN_NOT_INSTALLED' }`. Runtime downloads via `elan` are rejected.

---

## 4. Mathlib Cache Sizing & Volume Maintenance

- **Volume Size**: Approximately 20 GB is required to store compiled Mathlib oleans across active toolchains.
- **Warm-Up Command**: During image build or initialization:
  ```bash
  docker compose run --rm lean-runner lake exe cache get && lake build
  ```
- **Read-Only Concurrency**: Pantograph mounts `/root/.cache/mathlib` with `:ro` to prevent write locks or concurrency races with Kimina builds.

---

## 5. Environment Variables Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Environment mode (`production` or `development`). |
| `PORT` | `3000` | Port for the Node.js reverse proxy / API server. |
| `LEAN_RUNNER_MODE` | `real` | `real`, `auto`, or `simulator`. `real` is enforced in production. |
| `LEAN_RUNNER_URL` | `http://lean-runner:8080` | Internal URL to Lake build container. |
| `KIMINA_URL` | `http://kimina:8080` | Internal URL to Kimina verification service. |
| `PIPELINE_STRICT_GOALS` | `false` | When `true`, enables 6th term requiring zero open goals/metavariables. |
| `GITHUB_CLIENT_ID` | Optional | Client ID for OAuth Device Flow integration. |
| `LEAN_BUILD_TIMEOUT_MS` | `300000` | Hard timeout for Lake builds (default 5 minutes). |
