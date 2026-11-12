---
name: Live output requirement
description: The user's requirement for immediate streamed output and a dedicated floating window.
---

Generated output must appear word by word, before the response is completed, in a dedicated Streaming popup that is movable, resizable, and collapsible.

**Why:** Dr. Kuczynski explicitly said it is necessary that users not wait for a completed response.

**How to apply:** Preserve genuine provider streaming. Do not substitute a completed-response request followed by simulated chunk playback when live streaming fails. Closing or collapsing the display must not stop the underlying generation or discard received output.
