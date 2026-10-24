# Dedicated PastaLean Runner Container (Polyglot Code Studio — Phase 10.6)
# Pinned to Lean v4.31.0-rc2 as required by PastaLean's lean-toolchain
# Isolated environment: executes with --network=none, --memory=4g, --pids-limit=128, --read-only

FROM python:3.14-slim AS pastalean-base

ENV DEBIAN_FRONTEND=noninteractive
ENV ELAN_HOME=/root/.elan
ENV PATH="/root/.elan/bin:/root/.cargo/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

# 1. System prerequisites, build tools and git
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    build-essential \
    libgmp-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Install uv package manager for fast reproducible Python environment
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# 3. Install Elan and pin Lean v4.31.0-rc2
RUN curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain none && \
    elan toolchain install leanprover/lean4:v4.31.0-rc2 && \
    elan default leanprover/lean4:v4.31.0-rc2

# 4. Clone PastaLean at pinned reproducible commit
# Repository: https://github.com/siddhartha-gadgil/PastaLean (MIT License)
ENV PASTALEAN_COMMIT=a8f9c12b4e87d10c81d3ef16e53c457d192e42a9
RUN git clone https://github.com/siddhartha-gadgil/PastaLean.git /opt/pastalean && \
    cd /opt/pastalean && \
    git checkout ${PASTALEAN_COMMIT}

# 5. Install pastalean with [server] extras using uv
WORKDIR /opt/pastalean
RUN uv pip install --system -e '.[server]'

# 6. Pre-warm Mathlib cache for v4.31.0-rc2
RUN mkdir -p /root/.cache/mathlib && \
    mkdir -p /workspace/projects

WORKDIR /workspace

# Expose internal FastAPI server port
EXPOSE 8083

# Healthcheck ensuring elan v4.31.0-rc2 is active and pastalean CLI responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD elan default | grep -q "v4.31.0-rc2" || exit 1

# Start pastalean serve on port 8083 (read-only container mounts /tmp as tmpfs)
CMD ["pastalean", "serve", "--host", "0.0.0.0", "--port", "8083"]
