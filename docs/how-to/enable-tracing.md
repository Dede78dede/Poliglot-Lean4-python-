# How-To: Enable OpenTelemetry Tracing

Polyglot Code Studio provides end-to-end distributed tracing across browser UI interactions, LSP requests, and backend execution engines.

*Last verified: 2026-10-29*

---

## 1. SDK Strategy & Pinned Version

To ensure stability across all modern browsers and Node environments:
- Polyglot Code Studio pins `@opentelemetry/sdk-trace-web` to **2.12.0** (2026-10-15 baseline).
- Migration to 3.0.x is planned for Phase 11.3 following upstream ecosystem stabilization.
- Local exporter default: `http://localhost:4318/v1/traces`. No telemetry is ever transmitted to external third-party endpoints.

---

## 2. Enabling Tracing

Tracing is gated by two dedicated feature flags:
- `ENABLE_OTEL_BROWSER=true`: Enables browser tracing and Monaco span emission.
- `ENABLE_OTEL_NODE=true`: Enables backend correlation and trace buffering.

Set these flags in `.env` or in **Settings > Feature Flags**.

---

## 3. Correlating Traces and Structured Logs

Every trace consists of:
- A 32-hex character `trace_id`.
- 16-hex character `span_id`s with parent-child relationships.
- Seamless correlation with `StructuredLogger`: all logs record `correlationId`, matching `trace_id`.

Inspect traces via `GET /api/v1/telemetry/trace/:traceId`. If a trace is expired or not found, the endpoint returns RFC 9457 error `OTEL_TRACE_CORRELATION_FAILED` (HTTP 404).
