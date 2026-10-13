# UI Phase D: communication, optional authentication UI, and account experience

Phase D keeps CampusStay frontend-only while making authentication screens, messaging, notifications, and account controls coherent and testable. The student application launches directly into Home and requires no credentials.

## Confirmed pre-change issues

- Login accepted empty values, had a dead Google control, and presented the manager prototype without explaining its security limitations.
- Registration fields were mostly uncontrolled, skipped validation, immediately opened Main, and treated unavailable Terms and Privacy content like real legal consent.
- Forgot Password had no controlled email or validation and claimed a reset email was sent.
- Messages read immutable sample data while Chat kept a separate screen-local copy. Sends disappeared after navigation, previews and ordering never updated, unread counts disagreed, and unknown IDs silently opened the first conversation.
- Chat described a manager as online without live presence and its property label could not open Property Details.
- Notification rows were static and noninteractive. Home always showed an unread dot regardless of data.
- Profile settings logged silently, Notifications did not navigate, and logout had no confirmation or state policy.

## State architecture

`src/demoAuth.ts` contains field validation, privacy-conscious email masking, and accurate availability feedback. It creates no account, token, credential store, or authentication session. Login, Register, Forgot Password, Splash, and Onboarding remain registered routes for future integration, but none guards the student experience.

src/communication.ts contains pure messaging and notification state transitions. CommunicationProvider holds a cloned copy of the existing samples for the current app process. Local sends are trimmed, get deterministic session IDs, update the preview, move that conversation to the front, and never produce simulated replies.

Conversations use explicit property IDs. Chat opens Property Details only when that ID resolves to the existing property record. The existing message notification maps to its existing conversation; other preserved notifications show honest unavailable feedback rather than inventing a destination.

Home, Messages, Notifications, Chat, and Profile consume the same unread state. Phase E replaces the earlier local-reset menu item with a confirmed Log Out action that clears student session state and resets navigation to Login. Login offers “Continue without signing in,” while fresh launches still open Home directly.

## Service boundaries

Login checks form shape locally before opening CampusStay. Registration finishes on a confirmation screen without creating an account. Forgot Password masks the entered address and states that no email was sent. Google sign-in and unavailable profile settings provide visible availability feedback.

No network request, persistent storage, authentication provider, external message, push notification, email, payment action, provider decision, booking approval, or manager authorization is performed.
