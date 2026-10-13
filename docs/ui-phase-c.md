# UI Phase C: demo application experience

Phase C keeps CampusStay frontend-only while making the five-step student application flow controlled, validated, and internally consistent.

## Existing flow audit

Before Phase C, room selection was the only guarded step. Personal and emergency inputs were uncontrolled, document controls said files were uploaded without selecting files, Review displayed fixed example identities, and submission opened a static status unrelated to the entered data. Bookings contained only sample booking categories.

## Application model

`src/application.ts` defines the draft, validation, document categories, review mapping, demo submission record, and application summary. Student ID, proof of registration, and ID/passport are required demo selections. Proof of funding is explicitly optional. These controls select categories only; they never access or upload files.

Draft values live in the Apply screen for the duration of its five steps. A new Apply screen starts a fresh draft for its property and accepts a supplied room only when that exact room belongs to the property and is available. Submitted records move into `ApplicationProvider`, which stores them in memory for the current app session only.

## Submission and status

Submission performs full validation, trims user-entered text, prevents repeated taps, creates a stable local `DEMO-CS-…` identifier, and opens the matching status screen. The status timeline says that no provider received the record, no files were verified, and no booking was confirmed.

Bookings adds a separate Applications tab. Session demo applications appear there with an explicit “No booking confirmed” message. Existing sample booking categories remain available and labeled as sample data.

No backend request, authentication, persistent storage, inventory reservation, file upload, payment, manager action, or booking confirmation is performed.
