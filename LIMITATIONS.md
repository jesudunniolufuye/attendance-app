Attendance App — Known Limitations

This MVP covers the core requirement: staff clock in/out from their own
phones, verified to be physically at the salon, with timestamps generated
by the server (not the phone) so they can't be backdated or altered.

Two things are intentionally out of scope for this version, noted here so
they're a known decision rather than a surprise later.

1. PIN sharing
A staff member could tell someone else their PIN, letting that person clock
them in or out remotely. The location check confirms the device is at the
salon, not who is physically holding it.
- What's already in place is that every clock-in and clock-out records the
  device's network address alongside the timestamp. Two different staff
  members clocking in from the same address in a short window, or a
  mismatched address between someone's clock-in and clock-out, are visible
  signals that can be spotted under manual review.
- Full prevention would require biometric verification (fingerprint or
  face) or a company-issued device restricted to one person, a
  meaningfully larger build, worth a separate conversation if this becomes
  a real concern in practice.

2. Adding new staff
New staff members are currently added via a short command run directly on
the server by whoever manages the system, not through a page in the app.
This keeps the setup process simple and avoids building a separate admin
login system for something that happens rarely (once per new hire).
- I plan to add this, but for the MVP I put this out of scope to keep up with the deadline, I can easily add this later.

Everything else
Every other part of the original spec — mobile clock-in/out, geolocation
verification against the salon's real location, server-side timestamps,
and the underlying database — is built and tested, including on a real
phone over its own network connection.
