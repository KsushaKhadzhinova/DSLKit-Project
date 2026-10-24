# Security policy

DSLKit is a student project (a web editor of diagrams as code, with server and client exercises). It has no production service, but the code is written and checked as if it had one.

## Reporting a vulnerability

Write to the owner of the repository privately (the e-mail in the profile of the repository owner) or open a private security advisory on GitHub (Security, then Report a vulnerability). Please do not open a public issue for a vulnerability.

Include: where the problem is (file or address), how to repeat it, and what it allows. A first answer is given within 7 days.

## What is checked

- Every lab and practical has negative tests, attack tests and an audit file (`AUDIT.md`).
- `docs/study/02-SECURITY-AUDIT.md` and `docs/testing/GRC-AUDIT.md` list the checks, the findings and the open risks.
- The continuous integration run fails on a known vulnerability in a production dependency (`npm audit --omit=dev --audit-level=high`).

## Supported versions

Only the latest commit of each working branch is supported.
