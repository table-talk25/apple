# Firebase notification fixes

- Share the Firebase bootstrap instead of initializing another app in pushNotificationService. Existing exported notification helpers and preference checks remain available.
- Replace removed sendMulticast with sendEachForMulticast; deduplicate recipients and send sequential batches of at most 500 tokens.
- Serialize non-string data values for FCM, omit null/undefined, and use Admin SDK Android/APNs field names. Android action descriptors remain in data.actions as JSON; native rendering still requires client support.
- Report total FCM failures as unsuccessful in the preference-aware helper; partial counts remain available in result.
- Do not log bootstrap credential values, parser excerpts, or raw SDK initialization errors. Other notification modules are not covered by this log cleanup.
- CI runs syntax checks and Jest on main, fix branches and PRs. Tests use Firebase mocks and do not verify delivery to real devices.

No dependencies or lockfiles changed. Real-device checks remain required for foreground/background delivery, deep links and interactive actions on Android/iOS. SDK initialization does not prove valid credentials or delivery.
