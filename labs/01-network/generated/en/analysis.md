#### 3.3.1 Load summary

Table 1 – Page load summary

| Metric | Value |
|---|---|
| Requests | 17 |
| Transferred, MB | 6.37 |
| Document protocol | HTTP/2.0 |
| DOMContentLoaded, ms | 3408 |
| onLoad, ms | 4393 |

Table 2 – Number of requests by resource type

| Resource type | Requests |
|---|---|
| script | 8 |
| stylesheet | 3 |
| xhr | 3 |
| image | 2 |
| document | 1 |

#### 3.3.2 Request: document, https://app.diagrams.net/

Table 3 – General request information

| Method | Status |
|---|---|
| GET | 200 |

Table 4 – Request headers

| Header | Value | Purpose |
|---|---|---|
| `accept` | text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,im... | Content types the client is ready to accept |
| `accept-encoding` | gzip, deflate, br, zstd | Supported response compression algorithms |
| `priority` | u=0, i | Resource loading priority (HTTP/2, HTTP/3) |
| `sec-ch-ua` | "Not:A-Brand";v="8", "Chromium";v="156", "HeadlessChrome";v="156" | Browser name and version (Client Hints) |
| `sec-ch-ua-mobile` | ?0 | Mobile device flag |
| `sec-ch-ua-platform` | "Windows" | Client operating system |
| `sec-fetch-dest` | document | Request destination (document, script, image) |
| `sec-fetch-mode` | navigate | Request mode (navigate, cors, no-cors) |
| `sec-fetch-site` | none | Relation of the request origin to the target site |
| `sec-fetch-user` | ?1 | The request was triggered by a user action |
| `upgrade-insecure-requests` | 1 | The client prefers a secure version of the resource |
| `user-agent` | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gec... | Browser and operating system identification |

Table 5 – Response headers

| Header | Value | Purpose |
|---|---|---|
| `access-control-allow-origin` | * | Origins allowed for cross-origin access (CORS) |
| `age` | 340 | Seconds the response stayed in a CDN or proxy cache |
| `cache-control` | public, max-age=600 | Resource caching rules |
| `cf-cache-status` | DYNAMIC | Cloudflare cache status (HIT, MISS) |
| `cf-ray` | a4909c8d8b81508e-WAW | Request identifier inside the Cloudflare network |
| `content-encoding` | br | Compression applied to the response body |
| `content-security-policy` | default-src 'self'; script-src https://www.dropbox.com https://api.trello.com... | Allowed sources of page resources (XSS protection) |
| `content-type` | text/html | Content type and encoding |
| `date` | Sun, 11 Oct 2026 20:28:29 GMT | Time the server produced the response |
| `expires` | Sun, 11 Oct 2026 20:32:49 GMT | Date after which the response is considered stale |
| `permissions-policy` | microphone=() | Page access to browser features (camera, geolocation) |
| `referrer-policy` | strict-origin | Which part of the address to send in Referer |
| `server` | cloudflare | Server or CDN software |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Requires opening the site over HTTPS only (HSTS) |
| `vary` | accept-encoding | Request headers the cached response depends on |
| `x-cloud-trace-context` | 5ef89efa3007bd5c0781a36430c141df | Request trace identifier in Google Cloud |
| `x-content-type-options` | nosniff | Forbids content type sniffing (nosniff) |
| `x-xss-protection` | 1; mode=block | Legacy browser XSS filter |

Table 6 – Request phases from the Timing tab

| Phase | Time |
|---|---|
| Queued/Stalled | — |
| DNS Lookup | 511 ms |
| Initial connection | 48 ms |
| SSL | 32 ms |
| Request sent | 0 ms |
| Waiting (TTFB) | 48 ms |
| Content Download | 4 ms |

Longest phase: DNS Lookup.

#### 3.3.3 Request: script, https://app.diagrams.net/js/bootstrap.js

Table 7 – General request information

| Method | Status |
|---|---|
| GET | 200 |

Table 8 – Request headers

| Header | Value | Purpose |
|---|---|---|
| `accept` | */* | Content types the client is ready to accept |
| `accept-encoding` | gzip, deflate, br, zstd | Supported response compression algorithms |
| `priority` | u=1 | Resource loading priority (HTTP/2, HTTP/3) |
| `referer` | https://app.diagrams.net/ | Address of the page that issued the request |
| `sec-ch-ua` | "Not:A-Brand";v="8", "Chromium";v="156", "HeadlessChrome";v="156" | Browser name and version (Client Hints) |
| `sec-ch-ua-mobile` | ?0 | Mobile device flag |
| `sec-ch-ua-platform` | "Windows" | Client operating system |
| `sec-fetch-dest` | script | Request destination (document, script, image) |
| `sec-fetch-mode` | no-cors | Request mode (navigate, cors, no-cors) |
| `sec-fetch-site` | same-origin | Relation of the request origin to the target site |
| `user-agent` | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gec... | Browser and operating system identification |

Table 9 – Response headers

| Header | Value | Purpose |
|---|---|---|
| `access-control-allow-origin` | * | Origins allowed for cross-origin access (CORS) |
| `age` | 0 | Seconds the response stayed in a CDN or proxy cache |
| `cache-control` | public, max-age=86400 | Resource caching rules |
| `cf-cache-status` | HIT | Cloudflare cache status (HIT, MISS) |
| `cf-ray` | a4909c8dfce2508e-WAW | Request identifier inside the Cloudflare network |
| `content-encoding` | br | Compression applied to the response body |
| `content-type` | text/javascript | Content type and encoding |
| `date` | Sun, 11 Oct 2026 20:28:29 GMT | Time the server produced the response |
| `etag` | W/"SyJN0w" | Resource version identifier for conditional requests |
| `expires` | Mon, 12 Oct 2026 20:28:29 GMT | Date after which the response is considered stale |
| `referrer-policy` | strict-origin | Which part of the address to send in Referer |
| `server` | cloudflare | Server or CDN software |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Requires opening the site over HTTPS only (HSTS) |
| `vary` | accept-encoding | Request headers the cached response depends on |
| `x-cloud-trace-context` | e456fac535de7f926bc773a79dd11a37 | Request trace identifier in Google Cloud |
| `x-content-type-options` | nosniff | Forbids content type sniffing (nosniff) |
| `x-xss-protection` | 1; mode=block | Legacy browser XSS filter |

Table 10 – Request phases from the Timing tab

| Phase | Time |
|---|---|
| Queued/Stalled | — |
| DNS Lookup | — |
| Initial connection | — |
| SSL | — |
| Request sent | 0 ms |
| Waiting (TTFB) | 26 ms |
| Content Download | 8 ms |

Longest phase: Waiting (TTFB).

#### 3.3.4 Request: xhr, https://app.diagrams.net/resources/dia.txt

Table 11 – General request information

| Method | Status |
|---|---|
| GET | 200 |

Table 12 – Request headers

| Header | Value | Purpose |
|---|---|---|
| `accept` | */* | Content types the client is ready to accept |
| `accept-encoding` | gzip, deflate, br, zstd | Supported response compression algorithms |
| `priority` | u=1, i | Resource loading priority (HTTP/2, HTTP/3) |
| `referer` | https://app.diagrams.net/ | Address of the page that issued the request |
| `sec-ch-ua` | "Not:A-Brand";v="8", "Chromium";v="156", "HeadlessChrome";v="156" | Browser name and version (Client Hints) |
| `sec-ch-ua-mobile` | ?0 | Mobile device flag |
| `sec-ch-ua-platform` | "Windows" | Client operating system |
| `sec-fetch-dest` | empty | Request destination (document, script, image) |
| `sec-fetch-mode` | cors | Request mode (navigate, cors, no-cors) |
| `sec-fetch-site` | same-origin | Relation of the request origin to the target site |
| `user-agent` | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gec... | Browser and operating system identification |

Table 13 – Response headers

| Header | Value | Purpose |
|---|---|---|
| `access-control-allow-origin` | * | Origins allowed for cross-origin access (CORS) |
| `age` | 119 | Seconds the response stayed in a CDN or proxy cache |
| `cache-control` | public, max-age=2592000 | Resource caching rules |
| `cf-cache-status` | HIT | Cloudflare cache status (HIT, MISS) |
| `cf-ray` | a4909c946a69508e-WAW | Request identifier inside the Cloudflare network |
| `content-encoding` | br | Compression applied to the response body |
| `content-type` | text/plain | Content type and encoding |
| `date` | Sun, 11 Oct 2026 20:28:30 GMT | Time the server produced the response |
| `etag` | W/"SyJN0w" | Resource version identifier for conditional requests |
| `expires` | Wed, 11 Nov 2026 20:28:30 GMT | Date after which the response is considered stale |
| `referrer-policy` | strict-origin | Which part of the address to send in Referer |
| `server` | cloudflare | Server or CDN software |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Requires opening the site over HTTPS only (HSTS) |
| `vary` | accept-encoding | Request headers the cached response depends on |
| `x-cloud-trace-context` | 5b8b613ae9d740fe8c756a3058aeecb6 | Request trace identifier in Google Cloud |
| `x-content-type-options` | nosniff | Forbids content type sniffing (nosniff) |
| `x-xss-protection` | 1; mode=block | Legacy browser XSS filter |

Table 14 – Request phases from the Timing tab

| Phase | Time |
|---|---|
| Queued/Stalled | — |
| DNS Lookup | — |
| Initial connection | — |
| SSL | — |
| Request sent | 0 ms |
| Waiting (TTFB) | 24 ms |
| Content Download | 7 ms |

Longest phase: Waiting (TTFB).

#### 3.3.5 Caching

Table 15 – Caching parameters

| Resource | Cache-Control | ETag | Last-Modified | max-age |
|---|---|---|---|---|
| https://app.diagrams.net/ | public, max-age=600 | — | — | 600 |
| https://app.diagrams.net/js/stencils.min.js | public, max-age=2592000 | W/"SyJN0w" | — | 2592000 |

#### 3.3.6 Document security

Table 16 – Security headers of the main document

| Header | Value |
|---|---|
| `content-security-policy` | default-src 'self'; script-src https://www.dropbox.com https://api.trello.com... |
| `strict-transport-security` | max-age=31536000; includeSubDomains |
| `x-frame-options` | absent |
| `x-content-type-options` | nosniff |

#### 3.3.7 Cookies

No cookies passed in either direction.

#### 3.3.8 Comparison of the regular network and Fast 3G

Table 17 – Comparison of load metrics

| Metric | Regular network | Fast 3G |
|---|---|---|
| Requests | 17 | 17 |
| Transferred, MB | 6.37 | 6.37 |
| DOMContentLoaded, ms | 3408 | 1412 |
| onLoad, ms | 4393 | 14565 |
| Document TTFB, ms | 48 | 584 |
