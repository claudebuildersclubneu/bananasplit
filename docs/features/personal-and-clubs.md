# Personal space and clubs

Decided 2026-10-13 (Jack), after research on Luma, Notion, Todoist, Trello,
Slack, Discord, Doodle, Heylo and campus tools. Supersedes the "Free club"
plan from a9b3141 and the old free /rsvp pages.

## The model

- **Personal**: every account has one, free forever. It is an Organization
  with `kind = PERSONAL`, `personalOwnerId` = the user, exactly one member
  (the owner). It holds personal tasks, a personal calendar, availability
  polls (When2meet-style) and RSVP event pages (Luma-style). No members,
  invitations, roles, people, org chart, finance, databases, notes.
- **Club**: a shared space (`kind = CLUB`). Anyone can start one. A new club
  gets a **30-day free trial** of everything (Society features), no card.
  When the trial ends the owner picks **Club** or **Society**. Until then
  the club is **paused**: everyone can still open and read everything,
  nothing is deleted, public RSVP and poll links keep working for guests,
  but members can't create or edit club content; owners and admins see a
  "Choose a plan" screen. Billing isn't connected yet: picking a plan
  applies at once (as Admin panel > Plan does today), behind the same seam
  (`changeOrgPlan`) a real checkout will call.
- **Joining a club is always free.** A joiner never sees a price, a trial
  or a paywall. Only owners and admins see plan prompts.
- Guests (people who RSVP or answer a poll) never need an account.

## Words

"Personal" and "Club" everywhere. No "workspace", "organization" or "org"
in the UI. "Start a club" (owner, trial) and "Join a club" (free, code or
link). Plans: Club and Society. Pricing says: "Joining members never pay."

## Sign-up and onboarding

1. Sign up: name, email, password (or Google).
2. Your profile (onboarding Flow A, all steps, everything after step 1
   skippable): photo/name/pronouns/time zone -> school -> bio and links ->
   when you can't meet -> review. This is a real profile about yourself.
   Saving step 1 creates the Personal space and marks onboarding done.
3. Then the **Personal dashboard** (below). Pending email invites show at
   the top of it.

If sign-up started from a specific place (an invite link, a poll, an event
page, "Start a club" on pricing), the user returns there after step 1 of
the profile; the rest of the profile can be finished later from the
dashboard ("Finish your profile" card).

- **Joining a club** (code or link): a club preview, Join, then one small
  club step: your role/title in this club (and confirm availability is
  shared). Then into the club.
- **Starting a club**: the full club setup (Flow B: name, data, labels,
  finance, teams, invite). The trial starts at creation. At the end, a
  "Bring anything in?" step lists your Personal events (RSVP pages), polls
  and tasks; checked ones move into the club one way, keeping their ids,
  links, RSVPs, tickets and responses.

## Personal dashboard (/app/{personal slug} home)

- The page uses the full width, like a club's Overview, and every block is
  the same card (icon, title, a link to its page), so both columns' headings
  line up. Shortcuts to Tasks, Calendar, Find a time and RSVPs sit on the
  same muted track as the Tasks layouts.
- Your clubs (one row each: name, logo, role, next meeting, open tasks,
  unread), then Join a club (a code, right there) or Start a club.
- When you meet next: upcoming events across all your clubs and Personal.
- Your RSVPs: events you're going to (public pages you RSVP'd to with this
  email) and the event pages you host.
- Due soon: your tasks across Personal and every club (labelled by club).
- Polls waiting on you, and your own find-a-time polls' responses, with a
  Find a time button.
- Finish your profile, when steps were skipped.

## Switching

The foot of the sidebar always lists **Personal & clubs**: Personal first
(your avatar), then your clubs, the one you're in marked; one click
switches (and is remembered). The menu at the top of the sidebar lists the
same, then Join a club / Start a club. Home (`/app`) opens the last space
used, else Personal.

Personal's sidebar: Home, Tasks, Calendar, Find a time, RSVPs. A club's
default sidebar puts Find a time and RSVPs right under Calendar; a club
that saved its own sidebar before they existed gets them there too, hidden
if it had hidden Polls (Find a time) or Calendar (RSVPs).

## Migration of existing data

- One-member FREE clubs (yesterday's converted personal spaces) become
  `kind = PERSONAL` again with `personalOwnerId` = their owner. If a user
  ends up with two, keep the oldest as Personal and leave the other a club
  on trial.
- Clubs with real members stay clubs on their current plan (SOCIETY).
- Every onboarded user without a Personal space gets one.
- The `plan = FREE` value now means "Personal". Clubs are TRIAL, CLUB or
  SOCIETY (trial end date stored on the club).

## Bring anything in (built)

The last club setup step (`/onboarding/organization/{slug}/bring`, B7)
lists the creator's Personal event pages, other calendar events (upcoming
and the last month), availability and question polls, and open top-level
tasks (by project), none ticked; skipped when there's nothing to bring.
`?bring={id}`, or the item remembered by "Start a club" on
`/app/{personal slug}/move?item={id}` (Move to a club), starts ticked.
`/app/{personal slug}/move` also lists the clubs you own or run, each
opening the same list with `?from=move`.

The move is `app.move_personal_items` (migration
`20261013190000_move_personal_items`, which documents every row it
touches): one transaction, ids kept, the caller must own the Personal space
and be OWNER or ADMIN of a club that isn't paused. Events move with
sign-ups, tickets, bring list and pending RSVP jobs, and become INTERNAL
(nothing lands on the club's public feed by itself). Polls move with slots,
responses, options and votes; a poll's scheduled event comes along. Tasks
move with subtasks, comments, activity and reminders; labels are matched in
the club by name or made there, Personal projects are dropped.
