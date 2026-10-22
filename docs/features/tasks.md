# Tasks: setup

One task board per organization, **open by default**: every member sees
every task. A task can be marked **private**, and then only the people on it
(plus owners and admins) can see it at all.

Every task has **one accountable owner**, a due date and a status; anyone
else on it is a collaborator ("also involved"). Leads hand work down their
reporting line, break it into subtasks, and post a Sunday update.
Assignments, mentions, due-date reminders and the daily digest go out by
email.

## For an org

### 1. Decide how mail leaves your org (once)

Assignment, mention, reminder and digest email uses the org's sender
(**Settings > Integrations > Email sender**) or the platform fallback; with
neither, members get in-app notifications only and nothing is emailed. See
`docs/features/platform-services.md`. Every message links to the task at
`/app/{org}/tasks/{taskId}`; someone who is signed out signs in and lands on
that task.

### 2. Turn on the task defaults you want

**Settings** (owners and admins) holds two rules, both off by default:

| Setting                   | What it does                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `taskRequireOwner`        | A new top-level task must name an owner.                                                                              |
| `taskRequireDueDate`      | A new top-level task must have a due date.                                                                            |
| `reminderLeadDaysDefault` | How many days before the due date the reminder goes out (1 by default). Each person can override it in their profile. |

The Claude Builders Club turns both rules on ("one task board, every task
has one owner and a due date") through **Settings > Bootstrap CBC
workspace**, which also creates the Design Requests project (led by the VP
Growth) and the "Needs President" and "Design" labels. Running it twice
changes nothing.

### 3. Publish an org chart (for hand-down rules and the Team view)

Hand-down rules and the Team view read the published chart
(**Org Chart > Publish**). Without one, everything still works: every
assignment is recorded as outside the chart and nothing is flagged, and the
Team view falls back to one lane per member.

## Who can see a task

The board is open on purpose: a club works better when anyone can find out
what is happening without asking. **Private** is the opt-in exception, for
the handful of things that are not everybody's business yet — succession,
a pay-style conversation, an unannounced partnership.

| Visibility                        | Who can read the task                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| **Everyone** (`ORG`, the default) | Every member of the organization.                                                            |
| **Private** (`PRIVATE`)           | Its **owner**, its **collaborators**, its **creator**, and org **OWNER/ADMIN**. Nobody else. |

### The database enforces it, not the app

The app_user `SELECT` policy on `Task` carries the rule, so a query that
forgot it returns nothing rather than leaking. The same predicate guards
the `UPDATE` and `DELETE` policies (you cannot blind-write a private task by
guessing its id) and the policies on everything that hangs off a task:
`TaskComment`, `TaskMention`, `TaskActivity`, `TaskAssignee`, `TaskLabel`
and the `Notification` rows that point at it. Writing INTO a private task is
guarded too, so nobody can drop a comment, a mention or a collaborator into
a thread they cannot see.

Two consequences worth knowing:

- Opening `/app/{org}/tasks/{id}` for a task you cannot see gives the
  **not-found page**, byte for byte the answer a task id that does not
  exist gives. That the two are indistinguishable is the point: the URL
  never tells you whether the task is real. (The page streams, so the
  response header is a 200 carrying the not-found body — again, exactly as
  for an id that does not exist.)
- Counts differ per viewer. "Oliver: 4 open" means four that _you_ can see.
  The Week view says so when you are looking at somebody else's work.

### Subtasks

**A subtask always has its parent's visibility.** You cannot make one
subtask of a private task public, or vice versa: the parent decides for the
whole tree, and a database trigger keeps them equal in both directions
(a new or re-parented subtask takes the parent's flag; changing the parent's
flag pushes down to the children).

The audience is worked out **per task**, not per tree, and that cuts both
ways:

- A subtask can be handed to somebody who is not on the parent — that is the
  point of handing work down. They see the subtask and not the parent, and
  the parent breadcrumb simply does not render for them, because RLS filters
  the relation too.
- The mirror image is the sharp edge: a **collaborator on a private parent
  does not automatically see its subtasks**, only the ones they are named
  on. Add them to the subtask as well, or do the work on the parent. The
  failure is safe — they see less, never more — but a parent can look as
  though it has no subtasks when it has some.

### Mentions

**On a private task you can only mention people who can already see it.**
The `@` picker offers only the audience, and the panel says so. A hand-typed
mention of anybody else is kept as plain text: no mention row, no
notification, no email. To mention somebody, add them as a collaborator
first — then they can see the task, which is the honest version of what a
mention means.

Making an open task private re-runs its stored mentions through the new
audience, so somebody mentioned while it was open stops being mentioned on
it, and their notification is already out of reach.

### Who can change the flag

**The task's owner, its creator, or an OWNER/ADMIN.** Not a collaborator:
otherwise adding one person to a private task would hand them the power to
publish it. Collaborators can still edit everything else.

### Email, notifications and the Sunday update

- Assignment, mention and comment mail only ever goes to people on the task,
  so it is inside the audience by construction. The renderer re-checks at
  send time anyway, and drops a message whose task went private (or whose
  recipient came off it) between the click and the drain.
- The **daily digest** filters the one section that reaches past your own
  tasks: a report's private blocker is not their manager's business unless
  the manager is on it or is an admin.
- The **Sunday update** is the interesting case. A posted update is stored as
  text and read by the whole club, so a private title would be republished
  into the open the moment you hit Post. Private items therefore **appear in
  your draft** — it is your week, and you can see them — marked _"private,
  not posted"_, and are **left out of what is posted and copied**. The
  composer says how many were held back. Put them in the note yourself if you
  want to.

### In the interface

Privacy is never a hidden setting:

- A **lock** sits before the title in every layout — the week, the board, the
  table, the calendar, the team lanes — and cards carry a **dashed edge**,
  which nothing else in the workspace uses.
- The task panel has a labelled **Everyone / Private** control next to owner
  and due date, and when a task is private it lists **who can see it** by
  name and face.
- The toolbar's **Filter** menu has a visibility section: everything I can
  see / **Private only** / open to the club. It is also a URL parameter,
  `?visibility=private`.

## Day to day

### One workspace, five layouts, two destinations

There used to be seven tabs side by side. Five of them draw the same tasks in
different shapes; the other two are pieces of work you do. So the five are
**layouts** of one filtered question, sharing one toolbar, and the other two
became **destinations** in the header.

| Layout        | What it is good at                                                                                                                                                                                                                                                                                                                     | Key |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **Board**     | Moving work along: Not started, In progress, **Blocked**, Completed. Cards are stories and tasks (each shows its epic); **Swimlanes by epic** (`?lanes=epic`) gives each epic a row, and dragging a card into another lane moves it into that epic. Dragging into Blocked asks what it's blocked on. Completed shows the last 14 days. | `1` |
| **Week**      | What is owed and by when: Overdue / Today / Tomorrow / Next 7 days / Later / No due date, plus what was finished this week.                                                                                                                                                                                                            | `2` |
| **List**      | Open work grouped by epic (stories with their tasks under them, roll-up progress), then everything outside an epic. A club without epics gets one plain list. A quick add on top takes `#tags`. The Free plan's only view.                                                                                                             | `3` |
| **Table**     | Filtering and bulk editing: 50 a page, sortable, hideable columns, bulk status, owner and delete.                                                                                                                                                                                                                                      | `4` |
| **Roadmap**   | Epics on a week timeline, grouped by project: each bar runs from the epic's start to its due date with its progress filled in, and this week is marked.                                                                                                                                                                                | `5` |
| **Dashboard** | Where the work in view stands (a mix bar), what's worth a look, and progress by project and person.                                                                                                                                                                                                                                    | `6` |

Due dates also show on the main Calendar (its Tasks layer). A **stat strip**
heads every layout: Open, Due this week, Overdue (one click shows them) and
Done this week, for the toolbar's question.

| Destination       | What it is                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| **Sunday update** | The weekly composer (below). Carries a dot until you have posted this week. |

The toolbar above the layouts is the same in all of them, a row of pills:

- **Scope** — _Mine_, _My team_ (only if you have reports) or _Everyone_.
- **Person**, **Project** (there even before the first project: its menu
  can make one) and **Tag**.
- **Search** — by title; `/` focuses it from anywhere, Enter applies it.
- **Filter** — status and visibility.
- Active filters show as removable pills with **Clear all**.

Finishing a task is one click on its circle: it fills, springs and pops
three seeds (not under reduced motion), and a toast says "Done: {title}"
with **Undo**, which puts it back as it was.

All of it lives in the URL, so a filtered view is a link you can paste into
Slack and the Back button does the obvious thing. Switching layout keeps the
filters, and the layout you used last is remembered per person.

**Blocked is not a bucket in the Week.** A blocked task still has a due date,
and hiding it in a bucket of its own is how a blocker survives three weeks
unnoticed. It sits in its real week with its reason showing, and the count
line at the top (`3 overdue · 2 due today · 1 blocked · 1 flagged`) filters to
just those in one click. The **Blockers** filter (blocked plus overdue,
org-wide) is the exec-sync agenda.

Keyboard: `1`–`6` switch layout, `/` focuses search, `c` starts a task.

**On a phone** Tasks has no Board or Table (a remembered or linked one
opens the List there, and the remembered layout is kept for the computer).
The stat strip is one bar, to scale: overdue, due this week, open for
later, done this week. Under it, the phone's layouts by name (List, Week,
Roadmap, Dashboard), then one row: whose work as icons you flip between
(three with _My team_), **Filters** (a sheet with person, project, tag,
status and visibility, and a link to all projects), and a search icon that
opens the search box. **New task** is at the top right; the List's quick
add is a computer thing.

Deep links other sections use, all unchanged:

- `?view=table&owner={userId}&status=open` — that person's open tasks (the
  Org Chart side panel). `status=open` means not completed.
- `?view=table&assignee={userId}` — tasks involving that person, as owner or
  collaborator (the People pages).
- `?view=mine` — your week (now the Week layout with the scope set to Mine).
- `/app/{org}/tasks/{taskId}` — one task's own page (every email link).

### Who can change a task

Editing a task — title, description, status, due date, labels, project,
owner, collaborators, subtasks — is open to its **creator**, its **owner**,
anyone **involved**, a **chart manager of the owner** (anyone above them in
the published chart), and **owners and admins**. Visibility is narrower: see _Who can change the flag_ above.

Everyone else gets the **self-assign carve-out**: any member may add or
remove **themselves** as a collaborator on any task they can see, and take
ownership of a task that has no owner. Nothing else — no title, status or
due-date edits, and never removing somebody else's ownership.

### Projects

**Tasks › Projects** lists the club's projects with their colour, lead,
status (active, on hold, done), start and target dates and progress (done
over all, epics left out). A project's own view is the workspace filtered to
it (`?project=`). Every project picker (the form's field and the
toolbar's Project pill) can make one on the spot: type a name and pick
**Create project “…”**. A new project takes the theme's next chart colour
unless one is picked. Archived projects never appear in pickers; a task
still filed under one shows it, marked archived, until somebody moves it.

| Who                                                                     | May                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| Every member, while **Members can create projects** is on (the default) | Create and edit (rename, recolour, lead, status, dates) |
| The project's lead                                                      | Edit it (even with the switch off), archive, unarchive  |
| Owners and admins                                                       | All of it, and delete (its tasks stay, unfiled)         |

The switch lives on **Settings › Tags**. The checks are in the server
actions (`src/lib/tasks/projects.ts`); the Project INSERT policy reads the
same switch, and DELETE is owners' and admins'.

### Tags

Tags (stored as labels) are typed on the spot: the tag field finds, toggles
and offers **Create tag “catering”**, which takes the theme's next chart
colour. Names are unique regardless of case, so typing "Catering" picks
"catering" instead of making a second. `#tag` in a title (the composer
and the List's quick add) tags the task: "Book a
photographer #showcase". Who may make new tags is **Members can create
tags** on **Settings › Tags** (everyone by default); owners and admins
rename, recolour, merge (with suggestions for near-duplicates like
"Design" and "designs") and delete there.

### Handing work down

Assigning someone is classified against the published chart:

| Relation             | Meaning                                              | Flagged |
| -------------------- | ---------------------------------------------------- | ------- |
| Self                 | You assigned yourself                                | no      |
| Handed down          | They report to you (at any depth)                    | no      |
| Peer                 | Neither of you is above the other                    | no      |
| **Above your level** | They are your manager, or sit higher in another line | **yes** |
| Outside the chart    | No published chart, or one of you holds no position  | no      |

Assigning above your level is allowed, but the app asks you to confirm,
marks the assignment **Flagged** on the card, the row and the panel, and
says so in the email. The person it was assigned to, or an owner or admin,
clears the flag with **Acknowledge**.

The **Team** layout is the place to do this: each lane header carries
**New task for {name}**, which opens the composer with that person already
set as owner.

### Subtasks, comments and mentions

A lead breaks a task into subtasks, each with its own inline owner and due
date; subtasks appear in the Week, the Team view, the calendar and reminders
with their parent as a breadcrumb. Comments support markdown. Typing `@` in
a description or comment opens a member picker; the server keeps only real
members (and, on a private task, only the audience) and notifies the newly
mentioned, never you. Mentions in code blocks are left as text.

Every task is an **epic**, a **story** or a **task**, and the database keeps
the nesting to that order: an epic is always top-level, a story sits at the
top or under an epic, a task at the top, under an epic or under a story.
Breaking a task into subtasks makes it a story (the subtasks are tasks).

- **Epic** (layers): a big outcome that spans weeks. It holds stories and
  tasks, and its progress rolls up from both levels.
- **Story** (bookmark): a deliverable one person owns; it holds tasks.
- **Task** (check-square): a single step.

The editor's **Type** offers only the types that fit where the task stands,
and the server checks again with plain-language refusals ("A task inside a
story can't be broken down any further.") before the database's trigger
would refuse (`src/lib/tasks/hierarchy.ts`). Moving a childless task into a
story makes it a task; moving an empty epic into an epic makes it a story.
Epics have no start date of their own: the Roadmap starts a bar when the
epic was made, or at its earliest dated piece of work. Clubs that never
make an epic see exactly the old one-level subtasks.

### Sunday updates

**Sunday update** drafts each person's week from their tasks: **done this
week**, **what's next** (due within 7 days or in progress) and **blocked**,
with the reason. Weeks run Monday 00:00 to Sunday 23:59 in the org's
timezone.

- **Copy as text** gives a plain-text update to paste into Slack.
- **Post update** saves it (with an optional note) as that week's record.
- Private tasks are shown in the draft and left out of both, as described
  above.
- Owners, admins and whoever holds the top of the chart see **who hasn't
  posted**. The leads expected to post are everyone holding a filled,
  non-advisor position below the top of the published chart (without a
  chart: members with a title).
- A lead who hasn't posted gets a reminder on Sunday at 18:00 their time.

### Email and notification preferences

| Email                  | When                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Assigned               | You became a task's owner or collaborator (self-assignment sends nothing). One message lists every task of a bulk assignment. |
| Mentioned              | Someone @mentioned you in a description or comment.                                                                           |
| Commented              | Someone commented on a task you own or are on (off by default).                                                               |
| Due reminder           | The lead time before the due date, at 09:00 your time (none when your lead is "on the due date": Due today covers it).        |
| Due today              | 09:00 your time on the due date.                                                                                              |
| Overdue                | 09:00 your time the day after the due date, once, if the task is still open.                                                  |
| Daily digest           | Your chosen hour (08:00 by default), if you turn it on.                                                                       |
| Sunday update reminder | Sunday 18:00, if you're a lead who hasn't posted.                                                                             |

Each person controls these in their profile's notification settings (older
accounts are upgraded to the new shape as they are read). Collaborators only
get due-date reminders (due soon, due today, overdue) if they opt in; the
owner always does.

Reminders are never cancelled when a task changes. Moving a due date,
changing the owner or completing the task simply makes the old reminder do
nothing when it comes due: the worker re-checks that the task is still open,
that its due date is unchanged and that the recipient is still its owner (or
an opted-in collaborator). A reminder that would arrive too late to be true
(a "due today" after midnight) is dropped too. Moving a date away and back
re-uses the same pending reminder, so nobody gets two.

## For the platform operator

| What                                  | Where                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reminders, digests, Sunday reminders  | Job kinds `task-reminder`, `task-digest` and `weekly-update-reminder`, drained by `/api/cron/jobs`                                                                                                                                                                     |
| Digest and Sunday-reminder scheduling | `GET /api/cron/task-digest` with `CRON_SECRET`, hourly (Vercel Pro cron, or the `Jobs pinger` GitHub workflow on Hobby, which calls it every 15 minutes). It also enqueues the due-today and overdue reminders of tasks that haven't changed since they were scheduled |
| Daily fallback                        | `GET /api/cron/task-digest?mode=daily` (in `vercel.json`) schedules the next 24 hours at each person's local hour, so a daily-cron-only deployment still sends on time                                                                                                 |
| Deep links                            | `NEXT_PUBLIC_APP_URL` must be the app's real origin: it builds every link in task email                                                                                                                                                                                |
| The visibility predicate              | `app.can_read_task(taskId)` (migration `20260924140000_c4_task_visibility`). Jobs run as app_service, which sees the whole org on purpose and filters in code — see `src/server/tasks/visibility.ts`                                                                   |

Both trigger modes are idempotent (one key per person per local date or
week) and can run side by side. The crons only enqueue; nothing is sent
until the job drain runs. `/api/cron/task-digest` fails closed without
`CRON_SECRET`.

## Local development

`pnpm db:seed` loads the Claude Builders Club board: tasks with one owner
and a due date each, a blocked task, subtasks handed down from Oliver to
Alex and Smyan, a flagged above-level assignment, comments with a mention,
the Design Requests queue, last week's Sunday updates, and **three private
tasks** — Jackson's "Spring exec transition plan" (with Oliver on it, and a
subtask that inherits the flag) and Oliver's "1:1 notes and growth plan for
Alex". Sign in as `kristine@example.edu` to see the board without them.

Mail goes to `.data/mail/` (open the `.html` files). Email from a click is
sent when the request finishes; reminders, digests and Sunday reminders wait
for a drain:

```
pnpm jobs:drain            # run everything due once
pnpm jobs:drain --watch    # keep draining every 5 seconds
```

To schedule digests and Sunday reminders locally, call the cron the way
Vercel does:

```
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/task-digest
```
