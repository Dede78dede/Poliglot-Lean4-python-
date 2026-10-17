# Deployment Security Headers Specification

Recommended production headers for self-hosted reverse proxies (Nginx / Caddy):
- Content-Security-Policy: default-src self; script-src self wasm-unsafe-eval;
- Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
