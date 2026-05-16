# Deploy lab on AWS with CloudFormation (EC2 + Docker)

Creates:

- Ubuntu EC2 instance
- Security group (SSH, 80, 443)
- Elastic IP (stable public address)
- IAM role (SSM Session Manager — optional SSH alternative)
- User-data: install Docker → pull `ghcr.io/dseevs/test-ci-cd:latest` → run on port 80

**Lab URL after ~3–5 minutes:** `http://<PublicIp>/acetic/`

---

## Prerequisites

1. **AWS account** and [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed  
2. **Configured credentials:** `aws configure`  
3. **EC2 key pair** in your region (EC2 → Key pairs → Create)  
4. **GHCR image exists** — GitHub Actions green on https://github.com/dseevs/test-ci-cd/actions  
5. **GHCR public** OR a GitHub PAT with `read:packages` (for private package)

---

## 1. Make GHCR package pullable

**Easiest:** https://github.com/users/dseevs/packages/container/test-ci-cd/settings → **Public**

**Or** keep private and pass `GhcrToken` when creating the stack.

---

## 2. Deploy the stack

Pick your region (example: `ap-south-1`):

```bash
cd deploy/aws

aws cloudformation deploy \
  --stack-name olabs-acetic-lab \
  --template-file cloudformation-ec2-lab.yaml \
  --parameter-overrides \
    KeyPairName=YOUR_KEY_PAIR_NAME \
    AllowedSSHCidr=YOUR_HOME_IP/32 \
  --capabilities CAPABILITY_IAM \
  --region ap-south-1
```

**Private GHCR package** — add token (avoid committing this; type in terminal only):

```bash
aws cloudformation deploy \
  --stack-name olabs-acetic-lab \
  --template-file cloudformation-ec2-lab.yaml \
  --parameter-overrides \
    KeyPairName=YOUR_KEY_PAIR_NAME \
    AllowedSSHCidr=YOUR_HOME_IP/32 \
    GhcrToken=ghp_your_token_here \
  --capabilities CAPABILITY_IAM \
  --region ap-south-1
```

`CAPABILITY_IAM` is required because the template creates an IAM role for SSM.

---

## 3. Get your server IP and URL

```bash
aws cloudformation describe-stacks \
  --stack-name olabs-acetic-lab \
  --region ap-south-1 \
  --query "Stacks[0].Outputs"
```

Look for:

- **PublicIp** — your server IP (use this, not `YOUR_SERVER_IP`)
- **LabUrl** — e.g. `http://3.110.x.x/acetic/`

Wait 3–5 minutes after stack `CREATE_COMPLETE`, then open **LabUrl** in a browser.

---

## 4. SSH (optional)

```bash
ssh -i ~/.ssh/YOUR_KEY.pem ubuntu@PUBLIC_IP_FROM_OUTPUTS
```

Check bootstrap:

```bash
sudo tail -f /var/log/olabs-lab-bootstrap.log
docker ps
curl -I http://127.0.0.1/acetic/
```

**Without SSH key** — use SSM Session Manager (role is attached):

```bash
aws ssm start-session --target INSTANCE_ID --region ap-south-1
```

---

## 5. Update lab after code changes

1. `git push` → wait for GitHub Actions Docker job green  
2. On the instance:

```bash
docker pull ghcr.io/dseevs/test-ci-cd:latest
docker stop olabs-acetic && docker rm olabs-acetic
docker run -d --name olabs-acetic --restart unless-stopped -p 80:80 ghcr.io/dseevs/test-ci-cd:latest
```

Or re-run UserData by replacing the instance (not required for every update).

---

## 6. Delete everything (stop charges)

```bash
aws cloudformation delete-stack \
  --stack-name olabs-acetic-lab \
  --region ap-south-1
```

---

## Costs (approximate)

- **t3.small** + Elastic IP: low cost while running; delete stack when not needed  
- Data transfer out may apply

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Stack fails on KeyPair | Create key pair in **same region** as deploy |
| Browser timeout | Security group allows 80; wait for bootstrap log |
| `docker pull` failed on instance | Public GHCR or pass `GhcrToken` |
| 404 on `/` | Use **`/acetic/`** |
| Blank page | Check bootstrap log; confirm image pull |

---

## HTTPS (later)

Point a domain to the Elastic IP and add Caddy/nginx on the host, or put an Application Load Balancer in front. See `deploy/Caddyfile.example`.
