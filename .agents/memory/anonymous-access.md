---
name: Anonymous access
description: Why Mind Probe uses anonymous browser-session identities instead of login gates.
---

Mind Probe must remain fully usable without any login, sign-in, registration, or authentication gate. Do not restore a login system unless the user explicitly requests the new replacement system.

**Why:** The user explicitly removed the former login system while requiring all database-backed analysis, payment attribution, diagnostics, visitor counting, and coherence behavior to remain available to every visitor.

**How to apply:** Preserve the anonymous browser-session identity used for database ownership and continuity. New functionality must work for anonymous visitors and must not redirect to, depend on, or conditionally unlock through a login.