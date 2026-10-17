# Pantograph Container (Polyglot Code Studio)
# Strictly pinned to Pantograph v0.3.19 with Lean v4.33.1 anchor
# Runs REPL / RPC daemon on port 8081 with read-only Mathlib cache mount

FROM ubuntu:22.04 AS pantograph-base

ENV DEBIAN_FRONTEND=noninteractive
ENV ELAN_HOME=/root/.elan
ENV PATH="/root/.elan/bin:${PATH}"

# 1. System prerequisites
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    build-essential \
    pkg-config \
    libgmp-dev \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Elan and strictly pin Lean v4.33.1 for Pantograph v0.3.19
RUN curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain leanprover/lean4:v4.33.1

# 3. Clone and build Pantograph v0.3.19
WORKDIR /opt/pantograph
RUN git clone https://github.com/leanprover-community/pantograph.git . && \
    git checkout v0.3.19 && \
    elan override set leanprover/lean4:v4.33.1 && \
    lake build

# 4. Configure shared Mathlib cache mount point (mounted :ro at runtime)
RUN mkdir -p /root/.cache/mathlib

WORKDIR /workspace

# Expose dedicated Pantograph REPL / RPC port 8081
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD test -f /opt/pantograph/.lake/build/bin/pantograph || exit 1

# Start Pantograph server daemon listening on port 8081
CMD ["/opt/pantograph/.lake/build/bin/pantograph", "--server", "--port", "8081"]
