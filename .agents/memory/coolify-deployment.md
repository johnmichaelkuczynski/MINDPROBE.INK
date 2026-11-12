---
name: Coolify deployment
description: Deployment target and the runtime verification needed when dependencies are pruned.
---

The deployment target is Coolify on Linux arm64, behind a Traefik HTTPS reverse proxy.

**Why:** Dr. Kuczynski specified this deployment environment.

**How to apply:** Preserve compatibility with that target when changing deployment configuration or runtime dependencies.

Verify the final pruned container, not only a production command run from a development checkout.

**Why:** Host production startup passed while the container failed because development dependencies were available on the host but absent from the runtime image.

**How to apply:** After bundling or dependency-classification changes, smoke-test the final Docker runtime. If the host cannot execute arm64 images, test the same Dockerfile on the host architecture and separately build the arm64 target.

The explicitly supplied external Neon database is the intended datastore; the workspace's default database is a separate target. Preserve standard `DATABASE_URL` support for Docker installations.

**Why:** The user replaced the database through the secure `NEON_DATABASE_URL` flow. The Neon connector's default project did not represent the newly supplied connection.

**How to apply:** Keep application pools and schema tools on the same selected database. Verify the target through the configured app connection before applying schema changes; do not assume the connector's default project is the current database.
