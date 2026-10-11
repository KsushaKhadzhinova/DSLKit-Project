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

The selected site is https://app.diagrams.net/ (draw.io). It is a web diagram editor with scenarios close to DSLKit: an editor, a canvas, notation templates and export. The network behaviour of such a site is representative for the future project: a heavy client application, shape libraries, API calls and a content delivery network.

### 3.2 Method

The page was loaded in Chromium 156 on Windows with an empty cache and without cookies. The log was recorded in the HAR format, as with the Export HAR item on the Network tab. Two runs covered the regular network and Fast 3G emulation (562.5 ms latency, 1.6 Mbit/s download, 750 Kbit/s upload, as in the Chrome DevTools preset). Fast 3G was chosen instead of Slow 3G because the assignment allows both and the load size is 6.37 MB.

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

**Overview.** The page needed 17 requests with a total size of 6.37 MB over HTTP/2 and finished loading in 4.4 s (onLoad). Scripts account for 8 requests and 6.31 MB, the heaviest being `stencils.min.js` (2.78 MiB), `app.min.js` (2.08 MiB) and `extensions.min.js` (1.13 MiB). All requests used the GET method, 16 of them finished with code 200 and one (the `log.diagrams.net` ping) with code 204.

**Caching.** The HTML document is cached for 10 minutes (`max-age=600`) and has no ETag or Last-Modified, so after expiry the browser downloads the whole page again. Static resources such as `stencils.min.js` are cached for 30 days (`max-age=2592000`) and have the weak ETag `W/"SyJN0w"`. The same ETag on different files shows that it is bound to the build version. There is no 304 response in the log because the browser cache was empty.

**Cookies.** Requests carry no `Cookie` header and responses carry no `Set-Cookie`. On the first visit the site sets no cookies and keeps application settings elsewhere.

**Security.** The document has `Content-Security-Policy`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin` and `Permissions-Policy`. The `X-Frame-Options` header is absent. Protection against embedding in foreign frames can be set with the CSP directive `frame-ancestors`, but it is not visible in the clipped header value.

**Document timing.** The longest phase is DNS Lookup (511 ms, a cold name lookup), followed by Initial connection 48 ms, SSL 32 ms, TTFB 48 ms and Content Download 4 ms. The server answered quickly and most of the time went to name resolution and the secure connection setup.

**Network emulation.** Under Fast 3G the full load time grew from 4393 to 14565 ms (3.3 times) and the document TTFB from 48 to 584 ms (12 times) because of the 562.5 ms channel latency. The slowest requests turned out to be `stencils.min.js` (23.5 s), `extensions.min.js` (14.2 s) and `app.min.js` (12.4 s). The data volume did not change, so the slowdown comes from bandwidth and latency rather than server load. DOMContentLoaded in the regular run (3408 ms) turned out higher than under Fast 3G (1412 ms). These are single measurements with a different DNS cache state, so repeated runs are needed for conclusions.

**Filtering by type.** `script` has the most requests (8), followed by `stylesheet` (3), `xhr` (3), `image` (2) and `document` (1). Scripts lead by volume. The log is saved in the HAR format.

## 4 Answers to Control Questions

1. **Which protocol does the site use?** HTTPS. The address starts with `https://`, the log shows version `HTTP/2.0` and the `Strict-Transport-Security` header pins HTTPS. It can be checked by the URL scheme, the lock icon and the Protocol column on the Network tab.
2. **Which methods occurred?** Only GET (17 of 17): fetching HTML, scripts, styles, images and data. POST, PUT, PATCH and DELETE are not needed for a plain page load, they serve to send and change data, for example when saving a file.
3. **Status codes.** Code 200 OK occurred 16 times, for example for the main document. Code 204 No Content occurred once for the `log.diagrams.net` ping, the response had no body. Code 304 Not Modified appears for a conditional request with `If-None-Match` after the cache expires: the server reports that the copy is fresh. Codes 404 (resource not found) and 500 (internal server error) are absent from the log.
4. **Request headers about the client.** `User-Agent` holds the browser and the operating system, `sec-ch-ua` holds the browser brand and version (`HeadlessChrome` in the log, because an automated Chromium made the recording), `sec-ch-ua-platform` holds the operating system (`"Windows"`).
5. **Response headers controlling caching.** `Cache-Control` (`public, max-age=600` for the document and `public, max-age=2592000` for `stencils.min.js`), `Expires` (the staleness date of the document) and `ETag` (`W/"SyJN0w"` for static files). The `Age` header (340 s for the document) shows the age of the response in the CDN cache.
6. **What are cookies.** Name and value pairs that the server sets with `Set-Cookie` and the browser returns with `Cookie`. They store sessions, preferences and analytics data. On draw.io no cookies passed in either direction on the first visit.
7. **Security headers.** `Content-Security-Policy` limits resource sources and protects against XSS. `Strict-Transport-Security` with `max-age=31536000` enforces HTTPS. `X-Content-Type-Options: nosniff` forbids guessing the content type. The `X-Frame-Options` header is absent, it protects against embedding the page into frames and clickjacking.
8. **The Timing chart.** It shows the request phases from the queue to receiving the body. TTFB (Waiting) is the time from sending the request to the first response byte, that is server work and network latency. Content Download is the transfer time of the body itself. For the document TTFB was 48 ms and the download 4 ms. For the large `stencils.min.js` the download phase is much longer (574 ms) because of its 2.78 MiB size.
9. **Effect of a slow connection.** The document TTFB grew from 48 to 584 ms and the page load time from 4.4 to 14.6 s. Channel latency increases TTFB of every request and low bandwidth increases Content Download of large files: `stencils.min.js` loaded for 23.5 s.
10. **Why a filter is needed.** It keeps only the selected types on the panel (Doc, CSS, JS, XHR, Img, Font), which simplifies finding heavy and redundant resources. The work used the types document (1), stylesheet (3), script (8), xhr (3) and image (2).
11. **What a CDN is and how to detect it.** A content delivery network keeps copies of resources on servers near the user. Signs: `server: cloudflare`, `cf-ray`, `cf-cache-status: HIT` for static files (served from the CDN cache) and `DYNAMIC` for the HTML document, which is not cached at the edge.
12. **How to save the log in the HAR format.** With the Export HAR button on the Network tab. HAR describes requests, responses and timings in JSON. It is needed to reproduce problems, hand them to developers and analyse automatically, as in this work.
13. **What the Referer header carries.** The address of the page that made the request: for subresources it is `https://app.diagrams.net/`, while the document request has no such header because the navigation was started manually. Referer is used for analytics and for protection against CSRF and hotlinking. Privacy is controlled by `Referrer-Policy`, here `strict-origin`.
14. **Why resources come from different domains.** Requests went to three domains: `app.diagrams.net` (14), `apis.google.com` (2, Google API integration) and `log.diagrams.net` (1, statistics collection). Separation gives dedicated servers for different tasks, use of external services, independent scaling and caching.
15. **How to find slow requests.** Sort by the Time column or look at the Waterfall. On the regular network the slowest are `extensions.min.js` (681 ms) and `stencils.min.js` (613 ms), under Fast 3G the slowest is `stencils.min.js` (23.5 s). Optimisation: compression (`br` is already applied), long caching (already 30 days), splitting and lazy loading of shape libraries, `preload` of critical resources, a CDN.
16. **What blocking requests are.** Scripts and styles that the browser loads and processes before continuing rendering: scripts without `async` and `defer`, CSS in `<head>`. They delay the first paint. They can be detected with the Initiator column, the Waterfall and tag attributes in HTML, while a single HAR cannot show whether a script blocks.

## Conclusion

The draw.io site uses HTTPS and HTTP/2, serves static resources through the Cloudflare CDN with a 30 day cache, sets no cookies on the first visit and builds its protection on CSP, HSTS and `nosniff`. Most of the page weight, 6.37 MB, comes from scripts (99 percent), so on a slow connection the load time grows 3.3 times, from 4.4 to 14.6 s. For DSLKit this means that heavy libraries (shapes, a WebAssembly core) must be cached for a long time, loaded lazily and compressed, while the HTML document should stay light.

## Appendix A – Listing of analyze-har.js

```js
import { HEADER_DOCS, T } from './i18n.js';

const SECURITY = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options'];
export const PHASES = { blocked: 'Queued/Stalled', dns: 'DNS Lookup', connect: 'Initial connection', ssl: 'SSL', send: 'Request sent', wait: 'Waiting (TTFB)', receive: 'Content Download' };

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
  headers.filter((h) => !h.name.startsWith(':')).slice(0, limit).map((h) => [`\`${h.name}\``, clip(h.value), HEADER_DOCS[lang][h.name.toLowerCase()] ?? '—']);

export const cacheInfo = ({ response: { headers } }) => {
  const cacheControl = find(headers, 'cache-control');
  const maxAge = /max-age=(\d+)/.exec(cacheControl ?? '')?.[1];
  return { cacheControl, etag: find(headers, 'etag'), lastModified: find(headers, 'last-modified'), maxAge: maxAge && Number(maxAge) };
};

export const securityRows = ({ response: { headers } }, lang = 'ru') => SECURITY.map((n) => [`\`${n}\``, clip(find(headers, n) ?? T[lang].absent)]);

export const cookieRows = (entries) =>
  entries.flatMap((e) => [...e.request.cookies.map((c) => [c.name, 'Cookie', e.request.url]), ...e.response.cookies.map((c) => [c.name, 'Set-Cookie', e.request.url])]);

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
    section(t.summary,
      tbl(t.captions.summary, [t.metric, t.value], [[t.requests, s.requests], [t.transferred, mb(s.bytes)], [t.protocol, s.protocol], [t.dcl, s.domContentLoaded], [t.onload, s.onLoad]]),
      tbl(t.captions.types, [t.type, t.requests], Object.entries(s.types).sort((p, q) => q[1] - p[1]))),
  ];
  for (const e of pick(log.entries)) {
    parts.push(section(`${t.reqLabel}: ${e._resourceType}, ${e.request.url}`,
      tbl(t.captions.general, [t.method, t.status], [[e.request.method, `${e.response.status} ${e.response.statusText}`.trim()]]),
      tbl(t.captions.reqHeaders, [t.header, t.hvalue, t.purpose], headerRows(e.request.headers, lang)),
      tbl(t.captions.resHeaders, [t.header, t.hvalue, t.purpose], headerRows(e.response.headers, lang)),
      tbl(t.captions.timing, [t.phase, t.time], timingRows(e, lang)),
      `${t.slowest}: ${slowestPhase(e)}.`));
  }
  const biggest = log.entries.reduce((a, b) => (bytes(b) > bytes(a) ? b : a));
  parts.push(section(t.cache, tbl(t.captions.cache, [t.resource, 'Cache-Control', 'ETag', 'Last-Modified', 'max-age'], [log.entries[0], biggest].map((e) => {
    const c = cacheInfo(e);
    return [clip(e.request.url), c.cacheControl ?? '—', c.etag ?? '—', c.lastModified ?? '—', c.maxAge ?? '—'];
  }))));
  parts.push(section(t.security, tbl(t.captions.security, [t.header, t.hvalue], securityRows(log.entries[0], lang))));
  const cookies = cookieRows(log.entries);
  parts.push(section(t.cookie, cookies.length ? tbl(t.captions.cookies, [t.name, t.type, t.reqLabel], cookies) : t.noCookies));
  if (slow) parts.push(section(t.compare, tbl(t.captions.compare, [t.metric, t.normal, 'Fast 3G'], compareRows(har, slow).map(([k, ...v]) => [t[k], ...v]))));
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
  const body = rows.map(([label, v], i) => {
    const w = Math.round((v / max) * 380);
    return `<text x="190" y="${i * 30 + 20}" text-anchor="end" font-size="13">${esc(label)}</text><rect x="200" y="${i * 30 + 6}" width="${w}" height="20" fill="#2563eb"/><text x="${206 + w}" y="${i * 30 + 21}" font-size="13">${v} ${unit}</text>`;
  }).join('');
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
    'fig-3-timing.svg': bars(Object.entries(PHASES).filter(([k]) => first[k] > 0).map(([k, label]) => [label, Math.round(first[k])]), T[lang].ms),
    'fig-4-load.svg': bars([[f.onload, s.onLoad], [f.onload3g, t.onLoad], [f.ttfb, Math.round(s.ttfb)], [f.ttfb3g, Math.round(t.ttfb)]], T[lang].ms),
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
  assert.equal(s.onLoad, 4393);
  assert.ok(s.bytes > 6e6);
});

test('summary and bytesByType ignore unknown transfer size', () => {
  const e = entry();
  e.response._transferSize = -1;
  assert.equal(summary(har([e])).bytes, 0);
  assert.deepEqual(bytesByType([e, entry()]), { document: 10 });
});

test('pick returns document, script and xhr only when present', () => {
  assert.deepEqual(pick(normal.log.entries).map((e) => e._resourceType), ['document', 'script', 'xhr']);
  assert.deepEqual(pick([entry()]).map((e) => e._resourceType), ['document']);
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
  assert.deepEqual(securityRows(e), [['`content-security-policy`', 'отсутствует'], ['`strict-transport-security`', 'max-age=1'], ['`x-frame-options`', 'отсутствует'], ['`x-content-type-options`', 'отсутствует']]);
  assert.equal(securityRows(e, 'en')[0][1], 'absent');
});

test('cookieRows lists request and response cookies', () => {
  const e = entry();
  e.request.cookies = [{ name: 'a' }];
  e.response.cookies = [{ name: 'b' }];
  assert.deepEqual(cookieRows([e, entry()]), [['a', 'Cookie', 'https://x.test/'], ['b', 'Set-Cookie', 'https://x.test/']]);
  assert.deepEqual(cookieRows(normal.log.entries), []);
});

test('timingRows and slowestPhase handle missing phases', () => {
  const e = entry();
  assert.deepEqual(timingRows(e).map((r) => r[1]), ['—', '1 мс', '2 мс', '—', '0 мс', '5 мс', '3 мс']);
  assert.equal(timingRows(e, 'en')[1][1], '1 ms');
  assert.equal(slowestPhase(e), 'Waiting (TTFB)');
  assert.equal(slowestPhase(entry({ timings: {} })), '—');
});

test('compareRows shows a slower page on Fast 3G', () => {
  const rows = compareRows(normal, fast);
  assert.deepEqual(rows.map((r) => r[0]), ['requests', 'transferred', 'dcl', 'onload', 'ttfb']);
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
  assert.match(bars([['a', 10], ['b', 5]], 'шт.'), /width="380".*width="190"/);
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
