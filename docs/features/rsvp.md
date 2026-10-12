# RSVP pages

A public sign-up page for an event, in the style of Luma. An owner or admin
turns it on for any event; anyone with the link signs up with a name, an
email and a phone number, member or not. Guests get a confirmation email,
then a reminder (email, and a text once Twilio is set up) a day and an hour
before the event.

## Where it lives

- **Public page:** `/e/{code}` (`src/app/e/[slug]`). The code is eight
  lowercase letters and digits, set the first time the page is turned on,
  and kept when the page is turned off and on again, so a shared link
  survives. Pages aren't indexed by search engines.
- **In the suite:**
  - _Calendar › RSVP pages_ lists every event that has one.
  - Each event's page has an **RSVP page** card.
  - _New event_ has **Take RSVPs with a public page**, which creates the
    page and opens its settings.
  - The management screen (`/app/{slug}/calendar/{eventId}/rsvp`) has two
    tabs:
    - **Guests:** search, filter, check-in, move guests between going and
      the waitlist, cancel or delete a sign-up, add a guest by hand, and
      export to CSV.
    - **Page settings:** cover image, background, spots, waitlist, open or
      closed, directions, and privacy.
- Owners and admins only (`events.write`).

## What the page shows

- The title, date and time in the club's timezone, and the location with a
  Google Maps link and embedded map (the keyless embed; CSP `frame-src`
  allows `https://www.google.com`).
- Directions ("How to find it", `Event.locationDetails`).
- The cover (square WebP crops in the public store, kind `event-covers`).
- **Hosted by:** the club and the event's host.
- **Who's going:** names shortened to "Maya P." and initials avatars.
- The online meeting link, only to someone who has signed up.

The host's privacy switches:

| Switch                                | Effect                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| Hide the address until people sign up | The address, directions and map show only to signed-up guests.                            |
| Hide who's going                      | No names on the page.                                                                     |
| Hide how many are going               | No head count or spots left. This also hides the names, since a list of names is a count. |

Backgrounds (`src/lib/rsvp/backgrounds.ts`):

- Light: banana, cream and peel.
- Dark: night, pine, brick and navy.
- Cover photo: the cover blurred and dimmed behind the page.

The registration card is always paper and ink, whatever the background.

## Spots and the waitlist

- `Event.rsvpCapacity` is the number of spots; null is unlimited.
- When the event is full:
  - with the waitlist on (`rsvpWaitlist`), new sign-ups join the waitlist;
  - without it, registration says the event is full.
- When a guest leaves the going list, the earliest person on the waitlist
  moves up and is emailed. Leaving means cancelling, being moved by a host,
  or being deleted.
- Raising the capacity or removing the limit moves people up the same way.
- Hosts can add a guest past capacity, and can move anyone to going.
- Sign-ups are counted under a per-event advisory lock
  (`pg_advisory_xact_lock`), so a rush for the last spots can't overbook
  (`src/server/rsvp/rsvp.db.test.ts`).
- Registration closes when the host turns off **Taking sign-ups** or when
  the event ends.

## Guests and their sign-up

- The same email can sign up once per event (`@@unique([eventId, email])`).
- Typing an email that is already signed up doesn't reveal or take over
  that sign-up. The page only says the confirmation was re-sent (at most
  hourly), and the email goes to its owner.
- A guest's browser keeps a signed key in an httpOnly cookie on
  `/e/{code}`: the registration id plus an HMAC of it under `AUTH_SECRET`
  (`src/server/rsvp/token.ts`). The links in their emails carry the same
  key (`/e/{code}/manage?key=...` sets the cookie), so any device they open
  the email on shows "You're going" with **Can't go**.
- Sign-up and cancel are Server Actions on the service path, scoped to the
  page's event (`app.rsvp_page(code)`, SECURITY DEFINER, service role
  only). They are rate limited per IP and have a honeypot field.

## Messages

Job kinds in `src/server/jobs/registry.ts`:

- `rsvp-email`: one email per guest. The templates are confirmation,
  waitlist, a spot opened, the day-before and hour-before reminders, and
  the event was cancelled.
- `rsvp-fanout`: queues one `rsvp-email` per guest.
  - Reminders are queued with `runAt` 24 hours and 1 hour before the start.
    Their key includes the start, so moving the event queues new reminders,
    and the old ones find the time changed and do nothing.
  - The event service queues a `cancelled` fan-out when an event with a
    page is deleted (not when it is merged).

Emails come from the club's own sender if it has one, otherwise from
"<Club> via Bananasplit". The text goes out with each reminder when
`SMS_DELIVERY` is live (`src/server/sms`, set up with `TWILIO_*` in
`.env.example`). It is best effort: a failed text never resends the email.
Each reminder is claimed on the registration (`reminderDaySentAt`,
`reminderHourSentAt`) before it is sent, so a retried job never reminds
twice.

Reminders depend on the job drain: every 15 minutes with the Jobs pinger,
or `*/5` on Vercel Pro (RUNBOOK, Background jobs). With only the daily
backstop cron, they arrive late.

## Data and access

- `EventRegistration` holds names, emails and phones. RLS lets only owners
  and admins read or change sign-ups in the suite (app_user). The public
  page and the jobs use app_service, scoped to the event's org.
- The org export includes sign-ups. It is owner-only.
- Turning a page off keeps its sign-ups. Deleting the event soft-deletes
  it, and its guests are emailed that it's cancelled.
