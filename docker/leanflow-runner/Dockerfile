# Dedicated LeanFlow & Faithfulness Runner Container (Polyglot Code Studio — Phase 10.7)
# LeanFlow autoformalization + leanscreen fidelity gate + LaTeX ingestion (span, latex2sympy2, py-nabla)
# Requires Python 3.12+ (C5), Bubblewrap for native Linux proving, and elan override support (C2)

FROM python:3.12-slim AS leanflow-base

ENV DEBIAN_FRONTEND=noninteractive
ENV ELAN_HOME=/root/.elan
ENV PATH="/root/.local/bin:/root/.elan/bin:/root/.cargo/bin:${PATH}"
ENV PYTHONUNBUFFERED=1
ENV LEANFLOW_HOME=/root/.leanflow

# 1. System prerequisites, build tools, Bubblewrap, uidmap, poppler-utils, and ripgrep
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    build-essential \
    libgmp-dev \
    bubblewrap \
    uidmap \
    poppler-utils \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Elan and default Lean v4.35.0
# LeanFlow does not impose a Lean version (C2); project toolchains are preserved via elan override set
RUN curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain none && \
    elan toolchain install leanprover/lean4:v4.35.0 && \
    elan default leanprover/lean4:v4.35.0

# 3. Clone epfl-lara/LeanFlow at pinned reproducible commit
# Repository: https://github.com/epfl-lara/LeanFlow (Apache-2.0 License)
ENV LEANFLOW_COMMIT=c4d92a15f01e74b39a8c17b5e821fa023e9c78d1
RUN git clone https://github.com/epfl-lara/LeanFlow.git /opt/leanflow && \
    cd /opt/leanflow && \
    git checkout ${LEANFLOW_COMMIT}

# 4. Install LeanFlow via official install-internal.sh script (C6)
WORKDIR /opt/leanflow
RUN chmod +x ./scripts/install-internal.sh && \
    ./scripts/install-internal.sh --non-interactive --no-editable

# 5. Install leanscreen (Python >= 3.12), span-lea, latex2sympy2, py-nabla, and pylatexenc
RUN pip install --no-cache-dir \
    leanscreen \
    span-lea \
    latex2sympy2 \
    py-nabla \
    pylatexenc \
    sympy \
    antlr4-python3-runtime

# 6. Prepare shared cache directory and workspace
RUN mkdir -p /root/.cache/mathlib && \
    mkdir -p /root/.leanflow && \
    mkdir -p /workspace/projects

WORKDIR /workspace

# Expose internal LeanFlow MCP / API bridge port
EXPOSE 8084

# Healthcheck ensuring elan, bubblewrap, and leanflow executable are operational
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD (bwrap --version && leanflow --version) || exit 1

# Default command: launch LeanFlow MCP / server bridge on port 8084
CMD ["leanflow", "serve", "--host", "0.0.0.0", "--port", "8084"]
