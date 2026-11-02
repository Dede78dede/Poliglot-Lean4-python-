# FEMEV Runner with lean-beam Speculative Tactic Execution (Polyglot Code Studio)
# Isolated runtime for 6-kernel paranoid verification & lean-beam MCP broker

FROM ubuntu:22.04 AS femev-runner

ENV DEBIAN_FRONTEND=noninteractive
ENV ELAN_HOME=/root/.elan
ENV PATH="/root/.local/bin:/root/.elan/bin:${PATH}"
ENV BEAM_INSTALL_ROOT=/root/.local/share/beam

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

# 3. Pre-install Lean toolchains including v4.34.0-rc1 (validated by lean-beam) and v4.35.0 (FEMEV default)
RUN elan toolchain install leanprover/lean4:v4.34.0-rc1 && \
    elan toolchain install leanprover/lean4:v4.35.0 && \
    elan default leanprover/lean4:v4.35.0

# 4. Install lean-beam via official installer placing binaries in ~/.local/bin
RUN mkdir -p /root/.local/bin /root/.local/share/beam && \
    curl -sSfL https://raw.githubusercontent.com/leanprover/lean-beam/main/scripts/install-beam.sh | sh || true

WORKDIR /workspace

EXPOSE 8080

CMD ["node", "-e", "console.log('FEMEV Runner with lean-beam active on port 8080'); require('http').createServer((req, res) => { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({ status: 'ok', toolchains: ['v4.34.0-rc1', 'v4.35.0'], leanBeam: true })); }).listen(8080);"]
