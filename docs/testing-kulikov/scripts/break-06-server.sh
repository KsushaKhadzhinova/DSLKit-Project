#!/bin/sh
# Static server / API edge cases. Usage: sh break-06-server.sh [base]
B=${1:-http://localhost:5197}
c(){ printf '%s -> ' "$1"; shift; curl -s -m 10 -o /dev/null -w '%{http_code} %{size_download}B\n' "$@"; }
c "traversal %2e%2e"      "$B/%2e%2e/package.json" --path-as-is
c "backslash traversal"   "$B/..%5c..%5cpackage.json" --path-as-is
c "ADS ::\$DATA"          "$B/index.html::\$DATA"
c "8.3 name"              "$B/INDEX~1.HTM"
c "case variant"          "$B/INDEX.HTML"
c "tools/ not served"     "$B/tools/server.js"
c "api bad json"          -X POST -H 'content-type: application/json' -d '{bad' "$B/api/validate"
c "api null source"       -X POST -H 'content-type: application/json' -d '{"source":null}' "$B/api/validate"
c "api number source"     -X POST -H 'content-type: application/json' -d '{"source":123}' "$B/api/render"
c "api array body"        -X POST -H 'content-type: application/json' -d '[1]' "$B/api/render"
c "api 2MB body"          -X POST -H 'content-type: application/json' --data-binary @/dev/null "$B/api/render"
c "long url 70KB"         "$B/$(head -c 70000 /dev/zero | tr '\0' a)"
c "OPTIONS (CORS)"        -X OPTIONS "$B/api/render"
curl -s -m 5 -D - -o /dev/null "$B/api/notations" | grep -i "access-control\|cache-control"
