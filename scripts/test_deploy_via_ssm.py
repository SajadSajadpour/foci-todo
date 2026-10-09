"""Contract tests for the SSM deployment request; no AWS calls are made."""

import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "deploy_via_ssm", Path(__file__).with_name("deploy-via-ssm.py")
)
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)


class DeploymentRequestTests(TestCase):
    def test_deploys_only_verified_commit_and_checks_public_health(self):
        sha = "a" * 40
        captured = {}

        def fake_aws(*arguments):
            captured["send_command_arguments"] = arguments
            return {"Command": {"CommandId": "test-command-id"}}

        invocation = SimpleNamespace(
            returncode=0,
            stdout=json.dumps({"Status": "Success", "StandardOutputContent": "healthy"}),
            stderr="",
        )
        environment = {
            "DEPLOY_SHA": sha,
            "EC2_INSTANCE_ID": "i-0123456789abcdef0",
            "DEPLOY_SITE_URL": "https://tasks.example.com",
        }

        with (
            patch.dict(os.environ, environment),
            patch.object(deployment, "aws", side_effect=fake_aws),
            patch.object(deployment.subprocess, "run", return_value=invocation),
        ):
            self.assertEqual(deployment.main(), 0)

        arguments = captured["send_command_arguments"]
        parameters = json.loads(arguments[arguments.index("--parameters") + 1])
        command = parameters["commands"][0]
        self.assertTrue(command.startswith("bash -lc "))
        self.assertIn("git rev-parse refs/remotes/origin/main", command)
        self.assertIn(f"git merge --ff-only {sha}", command)
        self.assertIn("compose.production.yaml up --build --wait -d", command)
        self.assertIn("--resolve tasks.example.com:443:127.0.0.1", command)
        self.assertIn("https://tasks.example.com/api/health", command)
        self.assertEqual(arguments[arguments.index("--instance-ids") + 1], environment["EC2_INSTANCE_ID"])

    def test_rejects_non_https_site_before_contacting_aws(self):
        with (
            patch.dict(
                os.environ,
                {
                    "DEPLOY_SHA": "a" * 40,
                    "EC2_INSTANCE_ID": "i-0123456789abcdef0",
                    "DEPLOY_SITE_URL": "http://tasks.example.com",
                },
            ),
            patch.object(deployment, "aws") as aws_call,
        ):
            with self.assertRaises(ValueError):
                deployment.main()
            aws_call.assert_not_called()
