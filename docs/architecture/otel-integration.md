# Architecture: OpenTelemetry Distributed Tracing

*Last verified: 2026-10-29*

## 1. Pinned Version Strategy

Polyglot Code Studio adheres to a pinned stability model:
- `@opentelemetry/sdk-trace-web` is pinned to **2.12.0**.
- The 2.12.0 baseline prevents browser runtime regressions and type incompatibilities.
- Migration to 3.0.x is scheduled for Phase 11.3 following ecosystem maturity.

---

## 2. Distributed Tracing Topology

```
Browser Client (Monaco / Chat / FEMEV)
   │ (withSpan, 32-hex trace_id, 16-hex span_id)
   ├───> Local OTLP Exporter: http://localhost:4318/v1/traces (Optional)
   └───> Polyglot Backend (StructuredLogger & BackendOtelEngine)
             │
             ├── Trace Correlation by correlationId = trace_id
             └── Endpoint: GET /api/v1/telemetry/trace/:traceId
```

### Trace Correlator
- The backend matches OpenTelemetry `trace_id` with `StructuredLogger` entries.
- Spans record duration, attributes, status (`OK` / `ERROR`), and SDK version (`2.12.0`).
- Uncorrelated or missing traces return RFC 9457 error `OTEL_TRACE_CORRELATION_FAILED` (HTTP 404).
