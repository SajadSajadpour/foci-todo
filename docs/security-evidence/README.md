# Security scan evidence

These snapshots were captured on October 9, 2026. The [security review](../security-review.md) explains the results and limits; the live dashboards may reflect later commits.

| Evidence | Source | Recorded result |
| --- | --- | --- |
| [SonarQube Cloud API snapshot](sonar-2026-10-09.json) | Public analysis of commit `abc462e` at 18:09 UTC | Quality gate passed; one open minor Caddy image privilege issue; no coverage metric. |
| [ZAP HTML report](zap-2026-10-09/report.html), [JSON report](zap-2026-10-09/report.json), and [scan configuration](zap-2026-10-09/zap.yaml) | Passive security scan generated at 17:30 UTC; deployment hostname redacted | Zero high, medium, or low alerts; four informational alert types. |

The ZAP copies replace the original deployment hostname with the reserved example hostname `redacted.example.com`; alert details and counts are otherwise preserved. The links inside these archived reports are examples, not live scan targets. The scan did not authenticate, and no production environment file or credential is included.

The [Sonar analysis configuration](../../.sonarcloud.properties) excludes this generated archive from source-code metrics. The application source and deployment configuration remain in scope.
