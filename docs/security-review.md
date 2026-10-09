# Security review

This is an assessment demo review, not a penetration test. The checks below were completed on October 9, 2026 against the public HTTPS deployment at `https://99-79-191-113.sslip.io/`.

## Automated evidence

- [GitHub Actions verification](https://github.com/SajadSajadpour/foci-todo/actions/runs/37966199640) passed formatting, lint, type checks, backend/API and PostgreSQL tests, desktop/mobile browser tests, production image builds, and Caddy configuration validation for the ZAP-driven header change.
- [SonarQube Cloud](https://sonarcloud.io/project/overview?id=SajadSajadpour_foci-todo) reports a passing quality gate. Its initial scan found nine security issues. Removing the checked-in local database password, replacing an inefficient email regex, and installing locked dependencies without lifecycle scripts reduced that count to one low-severity issue.
- The first [ZAP passive baseline](https://github.com/SajadSajadpour/foci-todo/actions/runs/37965264544) found no high or medium alerts, four low alerts for missing browser isolation/privacy headers, and four informational alerts. The HTTPS gateway now sends those four headers and `Cache-Control: no-store` on `/api/*` responses. The second [ZAP passive baseline](https://github.com/SajadSajadpour/foci-todo/actions/runs/37966669553), run after redeployment, found **zero high, medium, or low alerts** and four informational alerts.
- The deployed home page and API health endpoint returned HTTP 200 over a verified TLS 1.3 connection. Sign-in and the existing task list were manually verified after the latest application redeployment.

## Findings and limits

The remaining Sonar issue is the official Caddy image running as root in the edge container. This is a real privilege tradeoff: Caddy binds ports 80/443 and writes certificate data to named volumes. The container has no host filesystem or Docker socket mount, but a container compromise could still affect the gateway and its certificate material. Moving it to a non-root user requires a tested volume-ownership and port-binding migration; that change was not rushed into this short-lived demo.

The second ZAP report's informational alerts are: a suspicious-comments match on a fragment of the minified JavaScript bundle, identification of the site as a modern web app, and two cache observations on the public app shell and static files. The evidence shown for the JavaScript alert does not contain a secret. The cache observations did not target authenticated API responses; those responses now receive `no-store` at the gateway.

ZAP used a short, unauthenticated passive scan. It did not exercise signed-in task routes, authorization bypasses, or destructive attack techniques. Account ownership and CSRF behavior are covered by automated API, PostgreSQL, and browser tests. Off-host database backup and a restore drill remain outside this temporary assessment deployment.
