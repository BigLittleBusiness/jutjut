# JutJut — AWS Deployment Runbook

This document describes how to deploy JutJut to AWS using ECS Fargate (recommended) or a single EC2 instance.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| AWS CLI | v2 | Interact with AWS services |
| Docker | 24+ | Build and push images |
| pnpm | 10.4.1 | Run database migrations |
| MySQL client | 8.0 | Verify DB connectivity |

---

## Option A — AWS ECS Fargate (recommended for production)

### 1. Create an ECR repository

```bash
aws ecr create-repository --repository-name jutjut --region ap-southeast-2
```

### 2. Store secrets in AWS Secrets Manager

Create one secret per variable listed in `.env.example`. The ECS task definition in `infrastructure/ecs-task-definition.json` references them by ARN.

```bash
aws secretsmanager create-secret \
  --name jutjut/DATABASE_URL \
  --secret-string "mysql://user:pass@host:3306/jutjut"
```

Repeat for every variable in the `secrets` array of `ecs-task-definition.json`.

### 3. Register the task definition

Replace all `<PLACEHOLDER>` values in `infrastructure/ecs-task-definition.json`, then:

```bash
aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs-task-definition.json
```

### 4. Create an ECS cluster and service

```bash
# Create cluster
aws ecs create-cluster --cluster-name jutjut-cluster

# Create service (adjust subnet/security-group IDs for your VPC)
aws ecs create-service \
  --cluster jutjut-cluster \
  --service-name jutjut-service \
  --task-definition jutjut \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### 5. Set up an Application Load Balancer

Point the ALB target group at port 3000 of the ECS service. Configure HTTPS on the ALB using an ACM certificate — TLS terminates at the ALB, so no certificate management is needed inside the container.

### 6. Configure GitHub Actions for automated deploys

Add the following secrets to your GitHub repository (`Settings → Secrets → Actions`):

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key with ECR push + ECS deploy permissions |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret |
| `AWS_REGION` | e.g. `ap-southeast-2` |
| `ECR_REPOSITORY` | ECR repository name, e.g. `jutjut` |
| `ECS_CLUSTER` | ECS cluster name, e.g. `jutjut-cluster` |
| `ECS_SERVICE` | ECS service name, e.g. `jutjut-service` |
| `CONTAINER_NAME` | Container name in the task definition, e.g. `jutjut` |

Every push to `main` will then build, push, and deploy automatically via `.github/workflows/deploy.yml`.

### 7. Run database migrations

Migrations run via `pnpm db:push`. On first deploy, exec into the running container:

```bash
aws ecs execute-command \
  --cluster jutjut-cluster \
  --task <TASK_ID> \
  --container jutjut \
  --interactive \
  --command "pnpm db:push"
```

---

## Option B — Single EC2 instance (simpler, lower cost)

### 1. Launch an EC2 instance

Recommended: `t3.small` (2 vCPU, 2 GB RAM) running Amazon Linux 2023 or Ubuntu 22.04.

### 2. Install dependencies

```bash
# Docker
sudo yum install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# pnpm / Node (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 22 && nvm use 22
npm install -g pnpm@10.4.1

# Nginx
sudo yum install -y nginx
```

### 3. Deploy the application

```bash
# Pull the latest image from ECR
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com

docker pull <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/jutjut:latest

# Run the container
docker run -d \
  --name jutjut \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /etc/jutjut/.env \
  <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/jutjut:latest
```

### 4. Configure Nginx

Copy `infrastructure/nginx.conf` to `/etc/nginx/nginx.conf`, update the domain name, then:

```bash
sudo certbot --nginx -d jutjut.com.au -d www.jutjut.com.au
sudo systemctl reload nginx
```

---

## Health check endpoint

The app exposes `/api/trpc/system.health` which returns HTTP 200 when the server is running. Both the Dockerfile `HEALTHCHECK` and the ECS task definition use this endpoint.

---

## Rollback

**ECS:** Update the service to point to the previous task definition revision:

```bash
aws ecs update-service \
  --cluster jutjut-cluster \
  --service jutjut-service \
  --task-definition jutjut:<PREVIOUS_REVISION>
```

**EC2:** Pull and run the previous image tag (every deploy is tagged with the Git SHA).
