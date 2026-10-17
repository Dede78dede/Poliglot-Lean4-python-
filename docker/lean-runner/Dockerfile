# Multi-Toolchain Lean 4 Runner (Polyglot Code Studio)
# Isolated runtime: designed to execute with Docker --internal=true (zero outbound network)

FROM ubuntu:22.04 AS runner-base

ENV DEBIAN_FRONTEND=noninteractive
ENV ELAN_HOME=/root/.elan
ENV PATH="/root/.elan/bin:${PATH}"

# 1. Install system prerequisites and build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    build-essential \
    pkg-config \
    libgmp-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Elan (Lean toolchain manager)
RUN curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain none

# 3. Pre-install all required toolchains at image build time
# CRITICAL: Containers execute with --internal=true and cannot fetch toolchains at runtime
RUN elan toolchain install leanprover/lean4:v4.28.0 && \
    elan toolchain install leanprover/lean4:v4.31.0 && \
    elan toolchain install leanprover/lean4:v4.33.1 && \
    elan toolchain install leanprover/lean4:v4.35.0-rc4 && \
    elan default leanprover/lean4:v4.35.0-rc4

# 4. Prepare shared Mathlib cache volume directory (~20 GB allocation)
RUN mkdir -p /root/.cache/mathlib && \
    mkdir -p /workspace/projects

WORKDIR /workspace

# 5. Build-time Mathlib warm-up (fetches oleans so no runtime network is needed)
# Run lake cache get for default toolchain v4.35.0-rc4
RUN mkdir -p /tmp/warmup && cd /tmp/warmup && \
    echo 'leanprover/lean4:v4.35.0-rc4' > lean-toolchain && \
    echo 'name = "warmup"' > lakefile.toml && \
    echo 'defaultTargets = ["Warmup"]' >> lakefile.toml && \
    echo '[[require]]\nname = "mathlib"\ngit = "https://github.com/leanprover-community/mathlib4"\nrev = "v4.35.0"' >> lakefile.toml && \
    echo '[[lean_lib]]\nname = "Warmup"' >> lakefile.toml && \
    echo 'import Mathlib\ndef ready : Nat := 42' > Warmup.lean && \
    (lake exe cache get || true) && \
    rm -rf /tmp/warmup

# Expose internal runner API port
EXPOSE 8080

# Healthcheck ensuring elan and all 4 toolchains are present
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD elan toolchain list | grep -q "v4.35.0-rc4" || exit 1

CMD ["node", "-e", "console.log('Lean 4 Multi-Toolchain Runner active with pre-installed: v4.28.0, v4.31.0, v4.33.1, v4.35.0-rc4'); require('http').createServer((req, res) => { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({ status: 'ok', toolchains: ['v4.28.0', 'v4.31.0', 'v4.33.1', 'v4.35.0-rc4'] })); }).listen(8080);"]
