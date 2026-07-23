# Cloudflare runtime SSRF harness

This isolated Worker is deployment-only evidence for CR-009. Configure
`SSRF_TEST_HOSTS` with hostnames owned by the test operator and set
`SSRF_TEST_TOKEN` as a Worker secret. The controlled hosts must cover:

- a public response;
- a redirect chain whose final target is loopback, private, link-local, or a metadata hostname;
- a DNS-change/rebinding scenario controlled by the operator.

Deploy this Worker without a public `workers.dev` or preview URL, invoke it through
an authenticated route or service binding, and preserve the response/log evidence.
Do not add real internal service addresses to the fixtures.

Unit tests do not close the DNS time-of-check/time-of-use portion of CR-009. That
finding remains open until this harness is executed in Cloudflare's production
runtime or arbitrary egress is moved behind a component that binds validation to
the actual connection.
