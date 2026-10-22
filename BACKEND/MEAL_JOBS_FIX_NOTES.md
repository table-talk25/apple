# Meal jobs: first correction batch

- mealStatusUpdater does not schedule anything at import. Explicit start is idempotent and stop destroys its two tasks. node-cron noOverlap prevents overlaps only within the process, not across replicas.
- Reminder lookup failures are caught; deleted participants are skipped and the host does not receive the guest reminder as well as the host reminder. Existing reminder windows remain unchanged; durable deduplication across replicas/restarts is not implemented.
- Video activation is restricted to virtual, pending, nonterminal and unexpired meals. Atomic conditional updates prevent competing workers from claiming the same pending call. Push is awaited and errors are handled per meal. A push failure after activation is reported, but not retried automatically.
- Removed the unrelated four-hour meal status rewrite from the video cron. State transitions belong to the status updater/service.
- This batch preserves the updater rule: at end, a meal with only the host becomes cancelled. Model/service status calculations are not yet unified. Do not treat this batch as completion of the status audit.
- Tests use mocks; real MongoDB query semantics, multi-replica scheduling and email/FCM delivery still require integration verification.
