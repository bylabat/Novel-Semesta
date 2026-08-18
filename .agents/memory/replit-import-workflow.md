---
name: Imported project workflow ports
description: Imported Vite projects may carry stale Replit port mappings that prevent workflow health checks.
---

Keep imported web projects mapped to one Vite webview port (5000) with the external port mapping on that same entry. Extra or mismatched port entries can make a healthy Vite process fail the workflow startup check.

**Why:** A stale secondary mapping caused the first workflow health check to time out even though Vite reported that it was ready on port 5000.

**How to apply:** Inspect `.replit` port entries before retrying a failed imported-project workflow; use the validated Replit config replacement flow for `.replit` changes.