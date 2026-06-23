# Deployment

Local:

```bash
docker compose up --build
```

Staging:

1. Build API, worker, and admin Docker images.
2. Run Prisma migration validation.
3. Apply Terraform for AWS network, logs, and storage.
4. Deploy Postgres, Redis, API, worker, and admin.
5. Configure APNs, FCM, OpenAI, billing, Sentry, and analytics secrets.
6. Run smoke tests and scheduled-call probes.

Production release:

- Tag builds.
- Produce mobile release artifacts.
- Verify store signing and push entitlements.
- Run privacy and security checklist.
