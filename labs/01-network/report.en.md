# Laboratory Work 1. Network Protocol Analysis and Developer Tools

## 1 Purpose of the Work

Gain practical skills in analysing web application network traffic: study the structure of HTTP/HTTPS requests and responses, headers, status codes, caching, cookies, security and timing on the example of a site close in topic to the DSLKit course project (a web IDE for diagrams as code).

## 2 Brief Theoretical Background

**Client-server model.** The browser sends an HTTP request and the server returns a response. Each message consists of a start line, headers and an optional body.

**HTTP and HTTPS.** HTTP runs over TCP, HTTP/3 runs over QUIC. HTTPS adds TLS encryption. HTTP/2 and HTTP/3 send several requests over one connection and compress headers.

**Methods.** GET reads a resource, POST creates data or submits a form, PUT replaces a resource, PATCH changes it partially, DELETE removes it.

**Status codes.** Class 1xx means informational, 2xx success (200 OK, 204 No Content), 3xx redirect and cache (301, 302, 304 Not Modified), 4xx client error (404 Not Found), 5xx server error (500 Internal Server Error).

**Headers.** Request headers: `User-Agent`, `Accept`, `Referer`, `Cookie`, `Authorization`. Response headers: `Content-Type`, `Cache-Control`, `Set-Cookie`, `Location`. Security headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`.

**Caching.** `Cache-Control: max-age` sets the lifetime of a copy. The `ETag` and `Last-Modified` headers let a conditional request check freshness and get a 304 response without a body.

**Cookies.** Small pieces of data that the server sets with `Set-Cookie` and the browser returns with `Cookie`: session, preferences, analytics.

**Timing.** Request phases: Queued and Stalled, DNS Lookup, Initial connection, SSL, Request sent, Waiting (TTFB), Content Download.

## 3 Progress of the Work

### 3.1 Site Selection and Justification

The project topic belongs to the SaaS direction, so a service of that type is chosen: https://app.diagrams.net/ (draw.io). It is a cloud web diagram editor with scenarios close to DSLKit: an editor, a canvas, notation templates and export. The network behaviour of such a site is representative for the future project: a heavy client application, shape libraries, API calls and a content delivery network.

### 3.2 Method

The page was loaded in Google Chrome 155 on Windows with an empty cache and without cookies. The log was recorded in the HAR format, as with the Export HAR item on the Network tab. Two runs covered the regular network and Fast 3G emulation (562.5 ms latency, 1.6 Mbit/s download, 750 Kbit/s upload, as in the Chrome DevTools preset). Fast 3G was chosen instead of Slow 3G because the assignment allows both and the load size is 6.40 MiB.

The log files are attached to the work: `labs/01-network/data/draw-io-normal.har` for the regular network and `labs/01-network/data/draw-io-fast3g.har` for Fast 3G. The analysis was made by the program from appendices A, B and C, its tests are described in appendix D. The page after loading is shown in Figure 1.

![draw.io page after loading](data/draw-io-normal.png)

Figure 1 – The draw.io start page after full loading

### 3.3 Log Analysis Results

The program built the tables below. For three different requests (the main document, a script and a data request) all request and response headers are listed with their purpose, which exceeds the minimum of five headers.

#### 3.3.1 Load summary

Table 1 – Page load summary

| Metric | Value |
|---|---|
| Requests | 17 |
| Transferred, MiB | 6.40 |
| Document protocol | HTTP/2.0 |
| DOMContentLoaded, ms | 337 |
| onLoad, ms | 1423 |

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
| `accept-language` | en-US,en;q=0.9 | — |
| `cache-control` | no-cache | Resource caching rules |
| `pragma` | no-cache | — |
| `priority` | u=0, i | Resource loading priority (HTTP/2, HTTP/3) |
| `sec-ch-ua` | "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24" | Browser name and version (Client Hints) |
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
| `age` | 1 | Seconds the response stayed in a CDN or proxy cache |
| `cache-control` | public, max-age=600 | Resource caching rules |
| `cf-cache-status` | DYNAMIC | Cloudflare cache status (HIT, MISS) |
| `cf-ray` | a4a9cecadfee2d19-WAW | Request identifier inside the Cloudflare network |
| `content-encoding` | br | Compression applied to the response body |
| `content-security-policy` | default-src 'self'; script-src https://www.dropbox.com https://api.trello.com... | Allowed sources of page resources (XSS protection) |
| `content-type` | text/html | Content type and encoding |
| `date` | Wed, 14 Oct 2026 21:51:51 GMT | Time the server produced the response |
| `expires` | Wed, 14 Oct 2026 22:01:50 GMT | Date after which the response is considered stale |
| `permissions-policy` | microphone=() | Page access to browser features (camera, geolocation) |
| `referrer-policy` | strict-origin | Which part of the address to send in Referer |
| `server` | cloudflare | Server or CDN software |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Requires opening the site over HTTPS only (HSTS) |
| `x-cloud-trace-context` | f8b2f570d45c3d950f603df4bd6b39d9 | Request trace identifier in Google Cloud |
| `x-content-type-options` | nosniff | Forbids content type sniffing (nosniff) |
| `x-xss-protection` | 1; mode=block | Legacy browser XSS filter |

Table 6 – Request phases from the Timing tab

| Phase | Time |
|---|---|
| Queued/Stalled | — |
| DNS Lookup | 38 ms |
| Initial connection | 39 ms |
| SSL | 25 ms |
| Request sent | 0 ms |
| Waiting (TTFB) | 81 ms |
| Content Download | 2 ms |

Longest phase: Waiting (TTFB).

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
| `accept-language` | en-US,en;q=0.9 | — |
| `cache-control` | no-cache | Resource caching rules |
| `pragma` | no-cache | — |
| `priority` | u=1 | Resource loading priority (HTTP/2, HTTP/3) |
| `referer` | https://app.diagrams.net/ | Address of the page that issued the request |
| `sec-ch-ua` | "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24" | Browser name and version (Client Hints) |
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
| `age` | 268 | Seconds the response stayed in a CDN or proxy cache |
| `cache-control` | public, max-age=86400 | Resource caching rules |
| `cf-cache-status` | HIT | Cloudflare cache status (HIT, MISS) |
| `cf-ray` | a4a9cecb894f2d19-WAW | Request identifier inside the Cloudflare network |
| `content-encoding` | br | Compression applied to the response body |
| `content-type` | text/javascript | Content type and encoding |
| `date` | Wed, 14 Oct 2026 21:51:51 GMT | Time the server produced the response |
| `etag` | W/"sWt9Ig" | Resource version identifier for conditional requests |
| `expires` | Thu, 15 Oct 2026 21:51:51 GMT | Date after which the response is considered stale |
| `referrer-policy` | strict-origin | Which part of the address to send in Referer |
| `server` | cloudflare | Server or CDN software |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Requires opening the site over HTTPS only (HSTS) |
| `vary` | accept-encoding | Request headers the cached response depends on |
| `x-cloud-trace-context` | 4ce5a37ac1ec327aeb976b774fbdd4b2 | Request trace identifier in Google Cloud |
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
| Waiting (TTFB) | 28 ms |
| Content Download | 10 ms |

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
| `accept-language` | en-US,en;q=0.9 | — |
| `cache-control` | no-cache | Resource caching rules |
| `pragma` | no-cache | — |
| `priority` | u=1, i | Resource loading priority (HTTP/2, HTTP/3) |
| `referer` | https://app.diagrams.net/ | Address of the page that issued the request |
| `sec-ch-ua` | "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24" | Browser name and version (Client Hints) |
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
| `age` | 285 | Seconds the response stayed in a CDN or proxy cache |
| `cache-control` | public, max-age=2592000 | Resource caching rules |
| `cf-cache-status` | HIT | Cloudflare cache status (HIT, MISS) |
| `cf-ray` | a4a9ced29c112d19-WAW | Request identifier inside the Cloudflare network |
| `content-encoding` | br | Compression applied to the response body |
| `content-type` | text/plain | Content type and encoding |
| `date` | Wed, 14 Oct 2026 21:51:52 GMT | Time the server produced the response |
| `etag` | W/"sWt9Ig" | Resource version identifier for conditional requests |
| `expires` | Sat, 14 Nov 2026 21:51:52 GMT | Date after which the response is considered stale |
| `referrer-policy` | strict-origin | Which part of the address to send in Referer |
| `server` | cloudflare | Server or CDN software |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Requires opening the site over HTTPS only (HSTS) |
| `vary` | accept-encoding | Request headers the cached response depends on |
| `x-cloud-trace-context` | ee94d72a0d25ec88c0f012c96fff1718 | Request trace identifier in Google Cloud |
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
| Content Download | 14 ms |

Longest phase: Waiting (TTFB).

#### 3.3.5 Caching

Table 15 – Caching parameters

| Resource | Cache-Control | ETag | Last-Modified | max-age |
|---|---|---|---|---|
| https://app.diagrams.net/ | public, max-age=600 | — | — | 600 |
| https://app.diagrams.net/js/stencils.min.js | public, max-age=2592000 | W/"sWt9Ig" | — | 2592000 |

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
| Transferred, MiB | 6.40 | 6.40 |
| DOMContentLoaded, ms | 337 | 1508 |
| onLoad, ms | 1423 | 15168 |
| Document TTFB, ms | 81 | 582 |

### 3.4 Graphical Presentation of Results

The distribution of requests by resource type is shown in Figure 2: most requests belong to scripts.

![Requests by type](generated/en/fig-1-types.svg)

Figure 2 – Number of requests by resource type

The distribution of transferred data by type is shown in Figure 3: scripts take 99 percent of the traffic.

![Data volume by type](generated/en/fig-2-bytes.svg)

Figure 3 – Transferred data volume by resource type in megabytes

The phases of the main document request are shown in Figure 4: the longest phase was DNS Lookup.

![Document request phases](generated/en/fig-3-timing.svg)

Figure 4 – Duration of the main document request phases in milliseconds

The effect of a slow connection is shown in Figure 5: loading under Fast 3G took three times longer and TTFB grew twelve times.

![Regular network versus Fast 3G](generated/en/fig-4-load.svg)

Figure 5 – Load time and TTFB on the regular network and on Fast 3G

### 3.5 Interpretation of Results

**Overview.** The page needed 17 requests with a total size of 6.40 MiB over HTTP/2 and finished loading in 1.4 s (onLoad). Scripts account for 8 requests and 6.34 MiB, the heaviest being `stencils.min.js` (2.78 MiB), `app.min.js` (2.11 MiB) and `extensions.min.js` (1.14 MiB). All requests used the GET method, 16 of them finished with code 200 and one (the `log.diagrams.net` ping) with code 204.

**Caching.** The HTML document is cached for 10 minutes (`max-age=600`) and has no ETag or Last-Modified, so after expiry the browser downloads the whole page again. Static resources such as `stencils.min.js` are cached for 30 days (`max-age=2592000`) and have the weak ETag `W/"SyJN0w"`. The same ETag on different files shows that it is bound to the build version. There is no 304 response in the log because the browser cache was empty.

**Cookies.** Requests carry no `Cookie` header and responses carry no `Set-Cookie`. On the first visit the site sets no cookies and keeps application settings elsewhere.

**Security.** The document has `Content-Security-Policy`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin` and `Permissions-Policy`. The `X-Frame-Options` header is absent. Protection against embedding in foreign frames can be set with the CSP directive `frame-ancestors`, but it is not visible in the clipped header value.

**Document timing.** The longest phase is TTFB (81 ms), followed by Initial connection 39 ms (it includes SSL 25 ms), DNS Lookup 38 ms and Content Download 2 ms. The server answered quickly and a noticeable part of the time went to name resolution and the secure connection setup.

**Network emulation.** Under Fast 3G the full load time grew from 1423 to 15168 ms (10.7 times) and the document TTFB from 81 to 582 ms (7.2 times) because of the 562.5 ms channel latency. The slowest requests turned out to be `stencils.min.js` (24.4 s), `extensions.min.js` (14.9 s) and `app.min.js` (12.9 s). The data volume did not change, so the slowdown comes from bandwidth and latency rather than server load. DOMContentLoaded grew from 337 to 1508 ms. These are single measurements, so repeated runs are needed for conclusions.

**Filtering by type.** `script` has the most requests (8), followed by `stylesheet` (3), `xhr` (3), `image` (2) and `document` (1). Scripts lead by volume. The log is saved in the HAR format.

### 3.6 Working with the DevTools Panels

The page was opened in Chrome 155 and the Network tab recorded requests with the cache disabled. In Chrome 155 the former Fast 3G profile is called Slow 4G: 562.5 ms latency, 1.6 Mbit/s download and 750 Kbit/s upload. It was used for the second measurement.

The overall view of the Network tab is shown in Figure 6: a list of 68 requests, the time scale and the summary line with 6.7 MB and a load time of 1.10 s.

![DevTools screenshot](figures/devtools-01-network.png)

Figure 6 – The Network tab after the page loaded with the cache disabled

Filtering by the JS type is shown in Figure 7: only scripts remain in the list.

![DevTools screenshot](figures/devtools-02-filter-js.png)

Figure 7 – Filtering requests by the JS type

The headers of the main document are shown in Figure 8: general information and response headers, among them Cache-Control, Content-Security-Policy, Strict-Transport-Security and X-Content-Type-Options.

![DevTools screenshot](figures/devtools-03-headers-response.png)

Figure 8 – Document request headers: general information and response headers

The request headers are shown in Figure 9: User-Agent, Sec-CH-UA, Sec-CH-UA-Platform and Accept-Language.

![DevTools screenshot](figures/devtools-04-headers-request.png)

Figure 9 – Request headers of the document

The request phases are shown in Figure 10 on the Timing tab.

![DevTools screenshot](figures/devtools-05-timing.png)

Figure 10 – The Timing tab of a single request

The security state is shown in Figure 11: a valid certificate, TLS 1.3 and all resources served securely.

![DevTools screenshot](figures/devtools-06-security.png)

Figure 11 – The Security panel

The cookie storage is shown in Figure 12: no cookies are set on the first visit.

![DevTools screenshot](figures/devtools-07-cookies.png)

Figure 12 – The Application panel, Cookies section

The list of network emulation profiles is shown in Figure 13.

![DevTools screenshot](figures/devtools-08-throttling-menu.png)

Figure 13 – Network emulation profiles in DevTools

The load with the Slow 4G profile is shown in Figure 14: the full load took 15.16 s and the slowest request was stencils.min.js (24.48 s).

![DevTools screenshot](figures/devtools-09-slow-4g-load.png)

Figure 14 – Page load with the Slow 4G profile

## 4 Answers to Control Questions

9. **Effect of a slow connection.** The document TTFB grew from 81 to 582 ms and the page load time from 1.4 to 15.2 s. Channel latency increases TTFB of every request and low bandwidth increases Content Download of large files: `stencils.min.js` loaded for 24.4 s.
10. **Why a filter is needed.** It keeps only the selected types on the panel (Doc, CSS, JS, XHR, Img, Font), which simplifies finding heavy and redundant resources. The work used the types document (1), stylesheet (3), script (8), xhr (3) and image (2).
11. **What a CDN is and how to detect it.** A content delivery network keeps copies of resources on servers near the user. Signs: `server: cloudflare`, `cf-ray`, `cf-cache-status: HIT` for static files (served from the CDN cache) and `DYNAMIC` for the HTML document, which is not cached at the edge.

## Conclusion

The draw.io site uses HTTPS and HTTP/2, serves static resources through the Cloudflare CDN with a 30 day cache, sets no cookies on the first visit and builds its protection on CSP, HSTS and `nosniff`. Most of the page weight, 6.40 MiB, comes from scripts (99 percent), so on a slow connection the load time grows 10.7 times, from 1.4 to 15.2 s. For DSLKit this means that heavy libraries (shapes, a WebAssembly core) must be cached for a long time, loaded lazily and compressed, while the HTML document should stay light.

## Appendix A – Listing of analyze-har.js

```js
import { HEADER_DOCS, T } from './i18n.js';

const SECURITY = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options'];
export const PHASES = {
  blocked: 'Queued/Stalled',
  dns: 'DNS Lookup',
  connect: 'Initial connection',
  ssl: 'SSL',
  send: 'Request sent',
  wait: 'Waiting (TTFB)',
  receive: 'Content Download',
};

const find = (headers, name) => headers.find((h) => h.name.toLowerCase() === name)?.value;
const clip = (s) => (s.length > 80 ? `${s.slice(0, 77)}...` : s).replaceAll('|', '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const bytes = (e) => Math.max(e.response._transferSize, 0);
const mb = (n) => (n / 1048576).toFixed(2);
const count = (entries, key) => {
  const out = {};
  for (const e of entries) out[e._resourceType] = (out[e._resourceType] ?? 0) + key(e);
  return out;
};

export const summary = ({ log }) => {
  const [first] = log.entries;
  return {
    requests: log.entries.length,
    bytes: log.entries.reduce((s, e) => s + bytes(e), 0),
    types: count(log.entries, () => 1),
    onLoad: log.pages[0].pageTimings.onLoad,
    domContentLoaded: log.pages[0].pageTimings.onContentLoad,
    protocol: first.response.httpVersion,
    ttfb: first.timings.wait,
  };
};

export const bytesByType = (entries) => count(entries, bytes);

export const pick = (entries) => ['document', 'script', 'xhr'].map((t) => entries.find((e) => e._resourceType === t)).filter(Boolean);

export const headerRows = (headers, lang = 'ru', limit = 20) =>
  headers
    .filter((h) => !h.name.startsWith(':'))
    .slice(0, limit)
    .map((h) => [`\`${h.name}\``, clip(h.value), HEADER_DOCS[lang][h.name.toLowerCase()] ?? '—']);

export const cacheInfo = ({ response: { headers } }) => {
  const cacheControl = find(headers, 'cache-control');
  const maxAge = /max-age=(\d+)/.exec(cacheControl ?? '')?.[1];
  return { cacheControl, etag: find(headers, 'etag'), lastModified: find(headers, 'last-modified'), maxAge: maxAge && Number(maxAge) };
};

export const securityRows = ({ response: { headers } }, lang = 'ru') => SECURITY.map((n) => [`\`${n}\``, clip(find(headers, n) ?? T[lang].absent)]);

export const cookieRows = (entries) =>
  entries.flatMap((e) => [
    ...e.request.cookies.map((c) => [c.name, 'Cookie', e.request.url]),
    ...e.response.cookies.map((c) => [c.name, 'Set-Cookie', e.request.url]),
  ]);

export const timingRows = ({ timings }, lang = 'ru') =>
  Object.entries(PHASES).map(([k, label]) => [label, timings[k] >= 0 ? `${timings[k].toFixed(0)} ${T[lang].ms}` : '—']);

export const slowestPhase = ({ timings }) =>
  Object.entries(PHASES).reduce((best, [k, label]) => (timings[k] > best[1] ? [label, timings[k]] : best), ['—', -1])[0];

export const compareRows = (a, b) => {
  const x = summary(a);
  const y = summary(b);
  return [
    ['requests', x.requests, y.requests],
    ['transferred', mb(x.bytes), mb(y.bytes)],
    ['dcl', x.domContentLoaded, y.domContentLoaded],
    ['onload', x.onLoad, y.onLoad],
    ['ttfb', x.ttfb.toFixed(0), y.ttfb.toFixed(0)],
  ];
};

export const report = (har, slow, lang = 'ru', prefix = '3.3') => {
  const t = T[lang];
  const { log } = har;
  const s = summary(har);
  let tableNo = 0;
  let sectionNo = 0;
  const tbl = (caption, head, rows) => `${t.tableWord} ${++tableNo} – ${caption}\n\n${table(head, rows)}`;
  const section = (title, ...body) => `#### ${prefix}.${++sectionNo} ${title}\n\n${body.join('\n\n')}\n`;
  const parts = [
    section(
      t.summary,
      tbl(
        t.captions.summary,
        [t.metric, t.value],
        [
          [t.requests, s.requests],
          [t.transferred, mb(s.bytes)],
          [t.protocol, s.protocol],
          [t.dcl, s.domContentLoaded],
          [t.onload, s.onLoad],
        ],
      ),
      tbl(
        t.captions.types,
        [t.type, t.requests],
        Object.entries(s.types).sort((p, q) => q[1] - p[1]),
      ),
    ),
  ];
  for (const e of pick(log.entries)) {
    parts.push(
      section(
        `${t.reqLabel}: ${e._resourceType}, ${e.request.url}`,
        tbl(t.captions.general, [t.method, t.status], [[e.request.method, `${e.response.status} ${e.response.statusText}`.trim()]]),
        tbl(t.captions.reqHeaders, [t.header, t.hvalue, t.purpose], headerRows(e.request.headers, lang)),
        tbl(t.captions.resHeaders, [t.header, t.hvalue, t.purpose], headerRows(e.response.headers, lang)),
        tbl(t.captions.timing, [t.phase, t.time], timingRows(e, lang)),
        `${t.slowest}: ${slowestPhase(e)}.`,
      ),
    );
  }
  const biggest = log.entries.reduce((a, b) => (bytes(b) > bytes(a) ? b : a));
  parts.push(
    section(
      t.cache,
      tbl(
        t.captions.cache,
        [t.resource, 'Cache-Control', 'ETag', 'Last-Modified', 'max-age'],
        [log.entries[0], biggest].map((e) => {
          const c = cacheInfo(e);
          return [clip(e.request.url), c.cacheControl ?? '—', c.etag ?? '—', c.lastModified ?? '—', c.maxAge ?? '—'];
        }),
      ),
    ),
  );
  parts.push(section(t.security, tbl(t.captions.security, [t.header, t.hvalue], securityRows(log.entries[0], lang))));
  const cookies = cookieRows(log.entries);
  parts.push(section(t.cookie, cookies.length ? tbl(t.captions.cookies, [t.name, t.type, t.reqLabel], cookies) : t.noCookies));
  if (slow)
    parts.push(
      section(
        t.compare,
        tbl(
          t.captions.compare,
          [t.metric, t.normal, 'Fast 3G'],
          compareRows(har, slow).map(([k, ...v]) => [t[k], ...v]),
        ),
      ),
    );
  return parts.join('\n');
};
```

## Appendix B – Listing of figures.js

```js
import { PHASES, bytesByType, summary } from './analyze-har.js';
import { T } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export const bars = (rows, unit) => {
  const max = Math.max(...rows.map((r) => r[1])) || 1;
  const body = rows
    .map(([label, v], i) => {
      const w = Math.round((v / max) * 380);
      return `<text x="190" y="${i * 30 + 20}" text-anchor="end" font-size="13">${esc(label)}</text><rect x="200" y="${i * 30 + 6}" width="${w}" height="20" fill="#2563eb"/><text x="${206 + w}" y="${i * 30 + 21}" font-size="13">${v} ${unit}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="${rows.length * 30 + 6}" font-family="Arial, sans-serif" fill="#1c1f2e">${body}</svg>\n`;
};

const byValue = (rows) => rows.sort((a, b) => b[1] - a[1]);

export const figures = (har, slow, lang = 'ru') => {
  const f = T[lang].figures;
  const s = summary(har);
  const t = summary(slow);
  const first = har.log.entries[0].timings;
  return {
    'fig-1-types.svg': bars(byValue(Object.entries(s.types)), f.pieces),
    'fig-2-bytes.svg': bars(byValue(Object.entries(bytesByType(har.log.entries)).map(([k, v]) => [k, Number((v / 1048576).toFixed(2))])), f.mb),
    'fig-3-timing.svg': bars(
      Object.entries(PHASES)
        .filter(([k]) => first[k] > 0)
        .map(([k, label]) => [label, Math.round(first[k])]),
      T[lang].ms,
    ),
    'fig-4-load.svg': bars(
      [
        [f.onload, s.onLoad],
        [f.onload3g, t.onLoad],
        [f.ttfb, Math.round(s.ttfb)],
        [f.ttfb3g, Math.round(t.ttfb)],
      ],
      T[lang].ms,
    ),
  };
};
```

## Appendix C – Listing of cli.js

```js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { report } from './analyze-har.js';
import { figures } from './figures.js';

const [normalFile, slowFile, lang, dir] = process.argv.slice(2);
const normal = JSON.parse(readFileSync(normalFile, 'utf8'));
const slow = JSON.parse(readFileSync(slowFile, 'utf8'));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'analysis.md'), report(normal, slow, lang));
for (const [name, svg] of Object.entries(figures(normal, slow, lang))) writeFileSync(join(dir, name), svg);
```

## Appendix D – Listing of the tests analyze-har.test.js

```js
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bytesByType, cacheInfo, compareRows, cookieRows, headerRows, pick, report, securityRows, slowestPhase, summary, timingRows } from './analyze-har.js';
import { bars, figures } from './figures.js';
import { HEADER_DOCS, T } from './i18n.js';

const file = (n) => fileURLToPath(new URL(`./data/${n}`, import.meta.url));
const load = (n) => JSON.parse(readFileSync(file(n), 'utf8'));
const normal = load('draw-io-normal.har');
const fast = load('draw-io-fast3g.har');

const entry = (o = {}) => ({
  _resourceType: 'document',
  request: { method: 'GET', url: 'https://x.test/', headers: [], cookies: [] },
  response: { status: 200, statusText: 'OK', httpVersion: 'HTTP/2.0', headers: [], cookies: [], _transferSize: 10 },
  timings: { dns: 1, connect: 2, ssl: -1, send: 0, wait: 5, receive: 3 },
  ...o,
});
const har = (entries) => ({ log: { entries, pages: [{ pageTimings: { onContentLoad: 7, onLoad: 9 } }] } });
const h = (name, value) => ({ name, value });

test('summary of the recorded draw.io load', () => {
  const s = summary(normal);
  assert.equal(s.requests, 17);
  assert.deepEqual(s.types, { document: 1, stylesheet: 3, script: 8, xhr: 3, image: 2 });
  assert.equal(s.protocol, 'HTTP/2.0');
  assert.equal(s.onLoad, 1423);
  assert.ok(s.bytes > 6e6);
});

test('summary and bytesByType ignore unknown transfer size', () => {
  const e = entry();
  e.response._transferSize = -1;
  assert.equal(summary(har([e])).bytes, 0);
  assert.deepEqual(bytesByType([e, entry()]), { document: 10 });
});

test('pick returns document, script and xhr only when present', () => {
  assert.deepEqual(
    pick(normal.log.entries).map((e) => e._resourceType),
    ['document', 'script', 'xhr'],
  );
  assert.deepEqual(
    pick([entry()]).map((e) => e._resourceType),
    ['document'],
  );
});

test('headerRows skips pseudo headers, limits rows, clips and escapes values', () => {
  const rows = headerRows([h(':path', '/'), h('Accept', 'a|b'), h('x-unknown', 'y'.repeat(100)), h('server', 'cf')], 'ru', 3);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['`Accept`', 'a\\|b', HEADER_DOCS.ru.accept]);
  assert.deepEqual(rows[1], ['`x-unknown`', `${'y'.repeat(77)}...`, '—']);
  assert.equal(headerRows([h('a', '1'), h('b', '2')]).length, 2);
  assert.equal(headerRows([h('Accept', '1')], 'en')[0][2], HEADER_DOCS.en.accept);
});

test('cacheInfo reads cache headers and max-age', () => {
  const e = entry();
  e.response.headers = [h('Cache-Control', 'public, max-age=86400'), h('ETag', '"1"'), h('Last-Modified', 'Mon')];
  assert.deepEqual(cacheInfo(e), { cacheControl: 'public, max-age=86400', etag: '"1"', lastModified: 'Mon', maxAge: 86400 });
  assert.deepEqual(cacheInfo(entry()), { cacheControl: undefined, etag: undefined, lastModified: undefined, maxAge: undefined });
});

test('securityRows marks absent headers in both languages', () => {
  const e = entry();
  e.response.headers = [h('Strict-Transport-Security', 'max-age=1')];
  assert.deepEqual(securityRows(e), [
    ['`content-security-policy`', 'отсутствует'],
    ['`strict-transport-security`', 'max-age=1'],
    ['`x-frame-options`', 'отсутствует'],
    ['`x-content-type-options`', 'отсутствует'],
  ]);
  assert.equal(securityRows(e, 'en')[0][1], 'absent');
});

test('cookieRows lists request and response cookies', () => {
  const e = entry();
  e.request.cookies = [{ name: 'a' }];
  e.response.cookies = [{ name: 'b' }];
  assert.deepEqual(cookieRows([e, entry()]), [
    ['a', 'Cookie', 'https://x.test/'],
    ['b', 'Set-Cookie', 'https://x.test/'],
  ]);
  assert.deepEqual(cookieRows(normal.log.entries), []);
});

test('timingRows and slowestPhase handle missing phases', () => {
  const e = entry();
  assert.deepEqual(
    timingRows(e).map((r) => r[1]),
    ['—', '1 мс', '2 мс', '—', '0 мс', '5 мс', '3 мс'],
  );
  assert.equal(timingRows(e, 'en')[1][1], '1 ms');
  assert.equal(slowestPhase(e), 'Waiting (TTFB)');
  assert.equal(slowestPhase(entry({ timings: {} })), '—');
});

test('compareRows shows a slower page on Fast 3G', () => {
  const rows = compareRows(normal, fast);
  assert.deepEqual(
    rows.map((r) => r[0]),
    ['requests', 'transferred', 'dcl', 'onload', 'ttfb'],
  );
  assert.ok(rows[3][2] > rows[3][1]);
});

test('i18n dictionaries have the same keys in both languages', () => {
  assert.deepEqual(Object.keys(HEADER_DOCS.ru), Object.keys(HEADER_DOCS.en));
  assert.deepEqual(Object.keys(T.ru), Object.keys(T.en));
  assert.deepEqual(Object.keys(T.ru.captions), Object.keys(T.en.captions));
  assert.deepEqual(Object.keys(T.ru.figures), Object.keys(T.en.figures));
});

test('report in both languages with captions and numbering', () => {
  const ru = report(normal, fast);
  assert.match(ru, /#### 3\.3\.1 Сводка загрузки/);
  assert.match(ru, /Таблица 1 – Сводные показатели загрузки страницы/);
  assert.match(ru, /Таблица 2 – Количество запросов по типам ресурсов/);
  assert.match(ru, /Cookie не передавались/);
  assert.match(ru, /Сравнение обычной сети и Fast 3G/);
  const en = report(normal, undefined, 'en', '3.4');
  assert.match(en, /#### 3\.4\.1 Load summary/);
  assert.match(en, /Table 1 – Page load summary/);
  assert.match(en, /No cookies passed in either direction\./);
  assert.doesNotMatch(en, /Fast 3G/);
});

test('report lists cookies and fills missing cache headers', () => {
  const e = entry();
  e.request.cookies = [{ name: 'sid' }];
  const out = report(har([e]), fast);
  assert.match(out, /\| sid \| Cookie \|/);
  assert.match(out, /\| https:\/\/x\.test\/ \| — \| — \| — \| — \|/);
});

test('bars scale to the largest value and survive all zeros', () => {
  assert.match(
    bars(
      [
        ['a', 10],
        ['b', 5],
      ],
      'шт.',
    ),
    /width="380".*width="190"/,
  );
  assert.match(bars([['a', 0]], 'x'), /width="0"/);
  assert.match(bars([['<a>', 1]], 'x'), /&lt;a&gt;/);
});

test('figures build four charts for each language', () => {
  const ru = figures(normal, fast);
  assert.deepEqual(Object.keys(ru), ['fig-1-types.svg', 'fig-2-bytes.svg', 'fig-3-timing.svg', 'fig-4-load.svg']);
  assert.match(ru['fig-4-load.svg'], /onLoad, обычная сеть/);
  assert.match(figures(normal, fast, 'en')['fig-4-load.svg'], /onLoad, regular network/);
});

test('cli writes the analysis and the figures', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'figs-')), 'nested');
  process.argv.splice(2, 4, file('draw-io-normal.har'), file('draw-io-fast3g.har'), 'en', dir);
  await import('./cli.js');
  assert.match(readFileSync(join(dir, 'analysis.md'), 'utf8'), /Comparison of the regular network and Fast 3G/);
  assert.equal(readdirSync(dir).length, 5);
});
```
