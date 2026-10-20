# Profiles: setup

Every member has one profile that follows them into every organization they
belong to: their name, picture, pronouns, major and graduation year, a short
bio, links, their timezone, which notifications they get by email, and their
personal calendar feed. The title ("VP Growth", "Head of Tech") is the one
thing that differs per organization, and each organization's admins set it.

## For an org

There is nothing to switch on. Once someone is a member they can open their
profile from the user menu (their picture, top right) > **Your profile**.

**Titles.** Owners and admins set each member's title in Settings > Members.
A title is separate from the permission role (Owner, Admin, Treasurer,
Member) and from the org chart; members cannot change their own title. A
person in two organizations can have a different title in each, and each
organization sees only its own.

**People.** **People > Directory** lists every current member with their
picture, title and team. Teams are the org chart's top-level branches (the
top position, its advisors and its reports who lead nobody are
"Leadership"; every other report of the top position starts a team named
from its title, "VP Growth" leads "Growth"); members not on the published
chart are "Not on the chart".

- **Search as you type**: every word must appear in the name, title, team,
  major, year ("2027", "class of 2027"), pronouns or role. The database does
  the matching; when nothing matches every word it shows **close matches**
  (typos: "jakson" finds Jackson).
- **Filters**: Free now, Team, Role and Year. **Free now** comes from the
  busy times members already share (Privacy decides who sees them): a member
  is free when the current hour in their own time zone is between 8 am and
  11 pm and not marked busy.
- **Sort** by team, name (with an A-Z rail) or newest, as a **grid** or a
  dense **list**. Big clubs load as you scroll.
- **The profile sheet**: pick anyone to open their profile beside the list
  (full screen on a phone). Up and down arrows move to the next person, Esc
  closes it, and the link (`?person=`) opens it again. It shows role and
  team, Copy email (only to owners and admins, or to everyone when Privacy >
  "Members see each other's emails" is on), Find a time, their tasks, About,
  where they sit on the org chart (reports to, leads), this week's busy
  times, open tasks, contact and links, and when they joined. The full page
  at `/people/{id}` shows the same profile.

Only members of the organization can see these pages; anyone else, and
anyone asking about a person who is not a current member, gets a "not
found" page. The filters, sort and open profile are all in the URL.

**Where pictures and names show up.** The user menu, the people pages, and
every section that shows a person with the shared avatar component (the org
chart, task assignees, database rows). A new name or picture shows straight
away, without signing out and in again.

## For a member

Profile sections (links such as `/app/{org}/profile#notifications` jump to
one):

- **Details**: name (required, up to 80 characters), pronouns (optional),
  major, graduation year, bio (up to 1,000 characters) and timezone. Leave
  the timezone on "Organization's timezone" to follow the org; pick your own
  and your reminders and digest follow you instead.
- **Picture**: upload a JPEG, PNG or WebP, crop it to a square, save. It is
  resized to small web images (64, 128 and 256 pixels) and anything hidden
  in the file, such as its location, is removed. **Remove** goes back to
  your Google picture, or your initials.
- **Links**: up to 8 of LinkedIn, GitHub, website, Instagram, TikTok, X or
  other. Addresses must start with `https://` or `http://` (typing
  `github.com/you` is fine; it is completed for you), and a LinkedIn,
  GitHub, Instagram, TikTok or X link must point at that site.
- **Email notifications**: one switch per kind of notification (tasks,
  events, organization), a **daily digest** of your tasks with the hour it
  arrives, and how many days before a due date the **reminder** comes (on
  the day, 1, 2, 3 or 5 days, or 1 or 2 weeks). Changes save as you make
  them. These only control email: everything still appears in the bell.
  The digest is off until you turn it on.
- **Calendar feed**: **Create link** gives you a private address to
  subscribe to from Google Calendar, Apple Calendar or Outlook, showing the
  events you are invited to. The link is shown **once**: copy it then. After
  that the page only says since when the feed is active. **Generate new
  link** replaces it (the old one stops working at once, so update your
  calendar apps) and **Turn off feed** stops it completely.

The old Settings > Notifications and Settings > Calendar feed pages now open
these profile sections.

## For the platform operator

| What | Where |
|---|---|
| Picture storage | The public Blob store, `BLOB_PUBLIC_READ_WRITE_TOKEN` (see platform-services.md). Keys `avatars/{userId}/{random}/s64.webp`, `s128`, `s256`; a replaced picture's files are deleted after the new one is saved. Locally, `.data/blob/public/`. |
| Uploads | `POST` / `DELETE /api/profile/avatar`: 4 MB cap (413 before the body is read), 10 uploads per hour per user, JPEG/PNG/WebP by content, re-encoded with sharp. |
| Feed links | Built from `NEXT_PUBLIC_APP_URL`. Only a SHA-256 of the token is stored (`UserCredential`); `app.clear_ics_token_hash()` turns a feed off. |
| Preferences | `User.emailPreferences`, shape v2 `{v:2, types, digest:{enabled, hourLocal}, reminderLeadDays}`. Older flat maps are upgraded when read (`src/lib/notifications/preferences.ts`); nothing to migrate. |
| Timezone | `User.timezone`, `NULL` = follow the organization. |

## For developers

- Reads: `src/server/profiles/queries.ts` (`getOwnProfile`, `listOrgPeople`,
  `getOrgPerson`, `getShellUser`, `userProfileSelect`) and
  `src/server/profiles/directory.ts` (`loadDirectory`, `searchPeopleInTx`,
  `getPersonSheet`), all in the viewer's RLS transaction. Teams:
  `chartTeams` in `src/lib/org-chart/teams.ts`; free now:
  `src/server/profiles/presence.ts`. UI: `src/components/profile/`
  (`people-directory.tsx`, `person-profile.tsx`, `directory-model.ts`).
- Search uses pg_trgm's `word_similarity` when the runtime role may call it.
  Today `app_user` has no EXECUTE on the pg_trgm functions, so the search
  uses the same trigram idea by hand (`termTrigrams`, the share of a word's
  trigrams found in the member's best-matching word) and switches by itself
  once `GRANT EXECUTE ON FUNCTION public.word_similarity(text, text) TO
  app_user` lands. Writes:
  `src/server/profiles/service.ts`, all on the user's own row through
  `withUserTx` (RLS and the column grant allow nothing else).
- Links into the section: `profileHref`, `peopleHref`, `personHref` and
  `personTasksHref` in `src/lib/profile/href.ts`. `personTasksHref` uses
  `?assignee=` today; Tasks switches that one function to
  `?owner={id}&status=open` when the single-owner model lands.
- Show a person with `<UserAvatar user={...} size="xs|sm|md|lg|xl|2xl" />`
  and the `userPublicSelect` shape (`src/server/members.ts`).
- Email jobs check `isEmailEnabled(user.emailPreferences, type)`; reminder
  and digest jobs read `parseNotificationPreferences()` and
  `effectiveTimezone(user, org)` (`src/lib/profile/timezone.ts`).
