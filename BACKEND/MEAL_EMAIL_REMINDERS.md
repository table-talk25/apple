# Scheduled meal email reminders

Both 10–15 minute and 60–70 minute jobs use mealEmailReminderService. Windows and schedules are unchanged. Both require the populated user's email preference to be explicitly true. Subject/body timing matches the window; reminder links support _id, id or mealId and use the app hash route. Reminder HTML escapes user content. Other email content is unchanged.

MealReminderDelivery is a new collection with deterministic string _id: meal ID, scheduled date, reminder window and user ID. Its built-in unique _id index permits only one automatic claimed attempt per key across processes and restarts. No manual migration or dependency change. Records do not contain recipient email addresses. There is no TTL or automated cleanup in this patch.

States: processing, accepted by SMTP, failed or uncertain. Acceptance does not prove inbox delivery. A duplicate key skips every existing state, including processing/failed/uncertain: this intentionally favors avoiding duplicate attempts over retrying missing messages. A process crash can leave processing records; no automatic retry or recovery is implemented. A rescheduled date or different window produces a different key. Claims do not deduplicate against emails sent before this deployment.

Meals/preferences are read at the start of each pass, not revalidated transactionally against an external SMTP send. Changes during a pass remain a race. Real MongoDB duplicate-key behavior, concurrent replicas and SMTP delivery need integration checks; tests use mocks. External direct callers of EmailService reminder methods gain corrected content but do not use the scheduler's delivery registry. User-account deletion integration and retention policy for the registry remain open work.

No change to meal status rules, registration/reset templates or Firebase video delivery.
