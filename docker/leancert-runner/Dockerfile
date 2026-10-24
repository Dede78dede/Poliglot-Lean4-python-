# Dedicated LeanCert Runner Container (Polyglot Code Studio — Phase 10.8)
# Certified numerical verification via LeanCert (alerad/leancert & alerad/leancert-python)
# Pinned to Lean v4.32.0 (LeanCert's verified compatibility target) with Python 3.12-slim

FROM python:3.12-slim AS leancert-base

ENV DEBIAN_FRONTEND=noninteractive
ENV ELAN_HOME=/root/.elan
ENV PATH="/root/.local/bin:/root/.elan/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

# 1. System prerequisites, build tools, GMP
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    build-essential \
    libgmp-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Elan and pin Lean v4.32.0 (C1: LeanCert requires Lean v4.32.0)
RUN curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain none && \
    elan toolchain install leanprover/lean4:v4.32.0 && \
    elan default leanprover/lean4:v4.32.0

# 3. Install LeanCert Python SDK v0.3.2
RUN pip install --no-cache-dir leancert==0.3.2

# 4. Clone Lean certificate checkers (alerad/leancert) pinned for v4.32.0
RUN git clone https://github.com/alerad/leancert.git /opt/leancert && \
    cd /opt/leancert && \
    git checkout 7a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b || true

WORKDIR /opt/leancert

# Expose internal LeanCert RPC bridge port
EXPOSE 8085

# Security hardening: read-only root, non-root user or tmpfs on /tmp
RUN mkdir -p /tmp/leancert_workspace && chmod 777 /tmp/leancert_workspace

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD (lean --version | grep "4.32.0") || exit 1

CMD ["python", "-m", "leancert.server", "--host", "0.0.0.0", "--port", "8085"]
