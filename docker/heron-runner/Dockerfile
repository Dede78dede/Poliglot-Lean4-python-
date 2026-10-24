# Dedicated Heron Runner Container (Polyglot Code Studio — Phase 10.8)
# Heron Linter and Refactoring engine for Lean 4 (Codeberg: wvhulle/heron)
# Requires Lean 4 fork (branch lean-fork/v4.31.0) for internal context access

FROM python:3.12-slim AS heron-base

ENV DEBIAN_FRONTEND=noninteractive
ENV ELAN_HOME=/root/.elan
ENV PATH="/root/.local/bin:/root/.elan/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

# 1. System prerequisites, build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    build-essential \
    libgmp-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Elan and Heron Lean fork (v4.31.0 fork)
RUN curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain none && \
    elan toolchain install leanprover/lean4:v4.31.0 && \
    elan default leanprover/lean4:v4.31.0

# 3. Setup Heron workspace
RUN mkdir -p /opt/heron_workspace
WORKDIR /opt/heron_workspace

# Setup minimal lakefile requiring heron from Codeberg
RUN cat <<'EOF' > lakefile.lean
import Lake
open Lake DSL

package «heron_project» where
  leanOptions := #[⟨`autoImplicit, false⟩]

require heron from git "https://codeberg.org/wvhulle/heron.git" @ "main"

@[default_target]
lean_lib «HeronProject» where
EOF

# Expose internal Heron LSP/linter port
EXPOSE 8086

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD (lean --version) || exit 1

CMD ["lean", "--server", "--port", "8086"]
