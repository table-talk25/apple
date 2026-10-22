# Video notification recovery

Activation persists VideoNotificationEvent before changing pending to active. The minute job then processes live events even when there are no new activations. This recovers a crash between activation and notification processing. No event is backfilled for calls already active before rollout. Existing active calls therefore do not receive retroactive alerts.

VideoNotificationDelivery stores per-user/device token hashes, not raw FCM tokens. Built-in unique _id keys identify the event/date, user and token. A conditional five-minute lease serializes normal concurrent attempts; completion updates require the same lease ID. Events and device attempts persist across restarts. No TTL or retention cleanup is included.

Each job attempt sends to one token through the existing push service, preserving known outcomes if another token fails. Provider acceptance is recorded, not claimed as real-device delivery. Transient/unknown failures retry with exponential delay starting at one minute plus jitter, up to five job attempts. Retry-After is honored when exposed on the SDK error. SDK internal network retries are additional. Exhausted leases on the final attempt are terminalized.

Explicit invalid/unregistered token errors stop retries and remove that token from its user. Generic invalid-argument/payload/configuration errors are terminal but do not remove tokens. Token cleanup failures are logged generically and are not retried automatically.

Before each attempted send, the meal must still be virtual, active, nonterminal, unexpired and match the event's scheduled date. Membership, user activity, current tokens, global push preference and meals.mealUpdates preference are checked from refreshed populated users. A newly eligible participant/token can be enqueued while an event remains live. Changes after the final read can still race the external send.

Accepted, permanent, skipped and exhausted devices are not retried. A response lost after FCM acceptance, a process crash, or a send lasting beyond the lease may still produce duplicate delivery on recovery. A stable notificationId is included, but client-side deduplication is not implemented here. Delivery is not exactly-once. Original event expiry is a snapshot; extending duration does not extend that event's retry horizon.

Tests mock MongoDB and FCM. Real compare-and-set behavior, concurrent workers, long-running SDK calls and device delivery require integration tests. No dependencies, email reminders or meal state rules changed.
