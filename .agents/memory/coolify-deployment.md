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
