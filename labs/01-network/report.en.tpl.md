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

The page was loaded in Chromium 156 on Windows with an empty cache and without cookies. The log was recorded in the HAR format, as with the Export HAR item on the Network tab. Two runs covered the regular network and Fast 3G emulation (562.5 ms latency, 1.6 Mbit/s download, 750 Kbit/s upload, as in the Chrome DevTools preset). Fast 3G was chosen instead of Slow 3G because the assignment allows both and the load size is 6.37 MB.

The log files are attached to the work: `labs/01-network/data/draw-io-normal.har` for the regular network and `labs/01-network/data/draw-io-fast3g.har` for Fast 3G. The analysis was made by the program from appendices A, B and C, its tests are described in appendix D. The page after loading is shown in Figure 1.

![draw.io page after loading](data/draw-io-normal.png)

Figure 1 – The draw.io start page after full loading

### 3.3 Log Analysis Results

The program built the tables below. For three different requests (the main document, a script and a data request) all request and response headers are listed with their purpose, which exceeds the minimum of five headers.

{{include:labs/01-network/generated/en/analysis.md}}

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

## Conclusion

The draw.io site uses HTTPS and HTTP/2, serves static resources through the Cloudflare CDN with a 30 day cache, sets no cookies on the first visit and builds its protection on CSP, HSTS and `nosniff`. Most of the page weight, 6.37 MB, comes from scripts (99 percent), so on a slow connection the load time grows 3.3 times, from 4.4 to 14.6 s. For DSLKit this means that heavy libraries (shapes, a WebAssembly core) must be cached for a long time, loaded lazily and compressed, while the HTML document should stay light.

## Appendix A – Listing of analyze-har.js

{{code:labs/01-network/analyze-har.js}}

## Appendix B – Listing of figures.js

{{code:labs/01-network/figures.js}}

## Appendix C – Listing of cli.js

{{code:labs/01-network/cli.js}}

## Appendix D – Listing of the tests analyze-har.test.js

{{code:labs/01-network/analyze-har.test.js}}
