# Shared meal lifecycle

Model virtuals, model syncStatus, bulk and single-meal status synchronization, statistics and the periodic status job use utils/mealLifecycle.js. The job delegates to the service.

Before start: upcoming. Start inclusive and end exclusive: ongoing. At/after end: cancelled when the distinct participant set including the host has at most one entry, completed otherwise. Stored completed/cancelled are final for automatic synchronization. No historical migration is performed.

Updates from the service match the observed status, date, duration, host and participant array to avoid overwriting intervening changes. Conflicts are reported as failures, not retried automatically. Newly terminal transitions also set videoCallStatus to ended. This flag does not close an external video-provider room.

Bulk failures propagate to initialization. Existing service export names are retained. Virtual statistics now include cancelled and count all stored meals. getMealsNeedingStatusUpdate now rejects on database failure instead of returning a misleading empty list. Model syncStatus uses the permitted notification type update. Explicit updateStatus remains available; this patch only freezes automatic transitions.

Tests cover helper time boundaries, real Mongoose virtuals without a database, mocked service failures/conflicts and job delegation. Real MongoDB compare-and-set behavior and external delivery remain integration checks. No dependency or lockfile changes.

Open work: durable reminder deduplication, video notification retries, other administrative endpoint response handling and remaining scheduler diagnostics. This patch supersedes the model/service inconsistency noted in MEAL_JOBS_FIX_NOTES.md.
