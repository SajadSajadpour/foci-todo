"""Deploy a verified main-branch commit to the single EC2 demo via SSM Run Command."""

import json
import os
import re
import shlex
import subprocess
import sys
import time
from urllib.parse import urlsplit


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"{name} must be set")
    return value


def aws(*arguments: str) -> dict:
    result = subprocess.run(
        ["aws", "ssm", *arguments, "--output", "json"],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def main() -> int:
    sha = required_env("DEPLOY_SHA")
    instance_id = required_env("EC2_INSTANCE_ID")
    site_url = required_env("DEPLOY_SITE_URL").rstrip("/")

    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("DEPLOY_SHA must be a full Git commit SHA")
    if not re.fullmatch(r"i-[0-9a-f]{8,17}", instance_id):
        raise ValueError("EC2_INSTANCE_ID must be an EC2 instance ID")
    parsed_url = urlsplit(site_url)
    if (
        parsed_url.scheme != "https"
        or not parsed_url.hostname
        or parsed_url.port not in (None, 443)
        or parsed_url.path
        or parsed_url.query
        or parsed_url.fragment
    ):
        raise ValueError("DEPLOY_SITE_URL must be an HTTPS origin, without a path")

    health_url = f"{site_url}/api/health"
    local_resolve = f"{parsed_url.hostname}:443:127.0.0.1"
    script = "\n".join(
        [
            "set -euo pipefail",
            "cd /opt/foci-todo",
            "test \"$(sudo -u ubuntu git remote get-url origin)\" = 'https://github.com/SajadSajadpour/foci-todo.git'",
            "test -z \"$(sudo -u ubuntu git status --porcelain)\"",
            "sudo -u ubuntu git fetch --no-tags origin main",
            f"test \"$(sudo -u ubuntu git rev-parse refs/remotes/origin/main)\" = {shlex.quote(sha)}",
            f"sudo -u ubuntu git merge --ff-only {shlex.quote(sha)}",
            "test -r /etc/opt/foci-todo/production.env",
            "docker compose -p foci-todo-demo --env-file /etc/opt/foci-todo/production.env -f compose.production.yaml config --quiet",
            "docker compose -p foci-todo-demo --env-file /etc/opt/foci-todo/production.env -f compose.production.yaml up --build --wait -d",
            f"curl --fail --silent --show-error --tlsv1.3 --tls-max 1.3 --resolve {shlex.quote(local_resolve)} {shlex.quote(health_url)}",
        ]
    )

    command = "bash -lc " + shlex.quote(script)
    response = aws(
        "send-command",
        "--instance-ids",
        instance_id,
        "--document-name",
        "AWS-RunShellScript",
        "--comment",
        f"Deploy verified foci-todo commit {sha[:12]}",
        "--timeout-seconds",
        "900",
        "--parameters",
        json.dumps({"commands": [command]}),
    )
    command_id = response["Command"]["CommandId"]
    print(f"SSM command {command_id} dispatched for {sha}", flush=True)

    deadline = time.monotonic() + 900
    while time.monotonic() < deadline:
        result = subprocess.run(
            ["aws", "ssm", "get-command-invocation", "--command-id", command_id, "--instance-id", instance_id, "--output", "json"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            if "InvocationDoesNotExist" not in result.stderr:
                print(result.stderr, file=sys.stderr)
                return 1
            time.sleep(8)
            continue

        invocation = json.loads(result.stdout)
        status = invocation["Status"]
        if status in {"Pending", "InProgress", "Delayed", "Cancelling"}:
            time.sleep(8)
            continue

        print(f"SSM deployment status: {status}")
        print(invocation.get("StandardOutputContent", ""))
        if invocation.get("StandardErrorContent"):
            print(invocation["StandardErrorContent"], file=sys.stderr)
        if status != "Success":
            return 1
        public_check = subprocess.run(
            [
                "curl",
                "--fail",
                "--silent",
                "--show-error",
                "--retry",
                "3",
                "--retry-delay",
                "2",
                "--retry-all-errors",
                "--tlsv1.3",
                "--tls-max",
                "1.3",
                health_url,
            ],
            check=False,
        )
        return public_check.returncode

    print("Timed out waiting for the EC2 deployment", file=sys.stderr)
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(f"Deployment failed: {error}", file=sys.stderr)
        sys.exit(1)
