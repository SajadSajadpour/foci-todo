# Continuous deployment for the EC2 assessment demo

The [Deploy workflow](../.github/workflows/deploy.yml) runs only after the Verify workflow succeeds on a push to this repository's main branch. It uses GitHub's OIDC identity to assume a narrowly scoped AWS role, sends a Systems Manager (SSM) command to the existing EC2 instance, and waits for the command's result. The host fetches and fast-forwards to the **exact verified commit**, rebuilds the existing HTTPS Compose project, waits for healthy containers, and checks the public API over TLS 1.3. A newer push will not cause an older verified run to deploy because the host checks that the verified SHA is still origin/main.

The job remains skipped until the repository variable DEPLOY_ENABLED is set to true. This prevents an AWS setup in progress from breaking normal CI. No AWS access keys or database passwords are stored in GitHub. The production environment file remains at /etc/opt/foci-todo/production.env on the host.

## One-time AWS setup

1. In EC2, note the instance ID, Region, and AWS account ID for the current host. Keep the existing /opt/foci-todo checkout and Compose project. The host needs outbound HTTPS access to GitHub, AWS Systems Manager, and the public demo hostname.
2. Attach an EC2 instance profile with the AWS-managed AmazonSSMManagedInstanceCore policy. Confirm that SSM Agent is running and that the instance appears **Online** in Systems Manager → Fleet Manager or Managed nodes. Ubuntu AMI packaging varies; check/install the agent if it does not appear. No inbound SSH rule is needed for SSM.
3. In IAM → Identity providers, add token.actions.githubusercontent.com as an OpenID Connect provider with audience sts.amazonaws.com, unless the account already has it.
4. Create an IAM role for GitHub Actions with the trust policy below. Replace ACCOUNT_ID. The repository was created on October 6, 2026; GitHub's [immutable subject format](https://docs.github.com/en/actions/reference/security/oidc) therefore includes owner ID 46099808 and repository ID 1407720204. The trust is restricted to this repository's main branch. Do not set a GitHub environment on the job without updating this trust policy, because that changes the OIDC subject.

   ~~~json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
             "token.actions.githubusercontent.com:sub": "repo:SajadSajadpour@46099808/foci-todo@1407720204:ref:refs/heads/main"
           }
         }
       }
     ]
   }
   ~~~

5. Give that role an inline policy allowing SSM Run Command **only** on this instance and the AWS-owned shell document. Replace REGION, ACCOUNT_ID, and INSTANCE_ID with the actual values. The AWS-owned document ARN deliberately has an empty account-ID field. GetCommandInvocation requires a wildcard resource so the workflow can report success or failure.

   ~~~json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "ssm:SendCommand",
         "Resource": [
           "arn:aws:ssm:REGION::document/AWS-RunShellScript",
           "arn:aws:ec2:REGION:ACCOUNT_ID:instance/INSTANCE_ID"
         ]
       },
       {
         "Effect": "Allow",
         "Action": "ssm:GetCommandInvocation",
         "Resource": "*"
       }
     ]
   }
   ~~~

6. In GitHub → repository Settings → Secrets and variables → Actions → **Variables**, add:

   | Variable | Value |
   | --- | --- |
   | AWS_DEPLOY_ROLE_ARN | ARN of the GitHub OIDC role |
   | AWS_REGION | EC2 instance Region |
   | EC2_INSTANCE_ID | Existing EC2 instance ID |
   | DEPLOY_SITE_URL | https://99-79-191-113.sslip.io for the current demo; omit the trailing slash |
   | DEPLOY_ENABLED | Keep unset until the checks below pass, then set to true |

7. Check that Verify is green on main, that the SSM instance is Online, and that the role ARN and region/instance variables are correct. Set DEPLOY_ENABLED=true, then push a small commit to main. GitHub Actions should show Verify followed by Deploy. Confirm the SSM command succeeds, the public API health endpoint responds, and the expected commit is checked out on EC2. The workflow never deploys pull-request runs.

For a failed deployment, read the Deploy job's SSM status and output. A failed deployment does **not** automatically roll back the single-host Compose stack. Correct the problem and push a tested commit, or recover the previous known-good commit manually. The database volume and Caddy certificate volumes remain attached across normal Compose updates. Off-host backups and a tested restore are still required before treating the host as a durable service.

References: [GitHub OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), [AWS SSM Run Command](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command.html), [AWS Run Command IAM policy examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/security_iam_id-based-policy-examples.html).
