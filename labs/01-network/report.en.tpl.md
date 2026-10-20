# Laboratory Work 1. Network Protocol Analysis and Developer Tools

## Contents

- [1 Purpose of the Work](#1-purpose-of-the-work)
- [2 Brief Theoretical Background](#2-brief-theoretical-background)
- [3 Progress of the Work](#3-progress-of-the-work)
  - [3.1 Site Selection and Justification](#31-site-selection-and-justification)
  - [3.2 Method](#32-method)
  - [3.3 Log Analysis Results](#33-log-analysis-results)
  - [3.4 Graphical Presentation of Results](#34-graphical-presentation-of-results)
  - [3.5 Interpretation of Results](#35-interpretation-of-results)
  - [3.6 Working with the DevTools Panels](#36-working-with-the-devtools-panels)
- [Conclusion](#conclusion)
- [References](#references)
- [Appendix A – Listing of analyze-har.js](#appendix-a--listing-of-analyze-harjs)
- [Appendix B – Listing of figures.js](#appendix-b--listing-of-figuresjs)
- [Appendix C – Listing of cli.js](#appendix-c--listing-of-clijs)
- [Appendix D – Listing of the tests analyze-har.test.js](#appendix-d--listing-of-the-tests-analyze-hartestjs)

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

## Conclusion

The draw.io site uses HTTPS and HTTP/2, serves static resources through the Cloudflare CDN with a 30 day cache, sets no cookies on the first visit and builds its protection on CSP, HSTS and `nosniff`. Most of the page weight, 6.40 MiB, comes from scripts (99 percent), so on a slow connection the load time grows 10.7 times, from 1.4 to 15.2 s. For DSLKit this means that heavy libraries (shapes, a WebAssembly core) must be cached for a long time, loaded lazily and compressed, while the HTML document should stay light.

## References

1. Laboratory work 1 "Network protocol analysis and developer tools": methodical instructions of the course ITiVP, module 01 (task, procedure, review questions).\n2. Module 01 materials "Internet architecture and network protocols", topic "Standardization organizations" (IETF, W3C, RFC): the theoretical basis of section 2.\n3. draw.io, a cloud diagram editor, the analysed site: https://app.diagrams.net/\n4. Network logs in HAR format recorded for this site on 14 October 2026 in Google Chrome 155: `labs/01-network/data/draw-io-normal.har` and `labs/01-network/data/draw-io-fast3g.har`.

## Appendix A – Listing of analyze-har.js

{{code:labs/01-network/analyze-har.js}}

## Appendix B – Listing of figures.js

{{code:labs/01-network/figures.js}}

## Appendix C – Listing of cli.js

{{code:labs/01-network/cli.js}}

## Appendix D – Listing of the tests analyze-har.test.js

{{code:labs/01-network/analyze-har.test.js}}
