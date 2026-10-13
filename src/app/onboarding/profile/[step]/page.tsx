import {
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarX,
  GraduationCap,
  KeyRound,
  Link2,
  Palette,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { VerifyEmailNotice } from "@/components/auth/verify-email-notice";
import {
  PreviewHeader,
  PreviewTile,
  SetupCard,
  SetupShell,
  StepFooter,
  StepIntro,
} from "@/components/onboarding/setup-shell";
import { ChoiceTileBody, choiceTileClass } from "@/components/onboarding/step-fields";
import { UserAvatar } from "@/components/user-avatar";
import { requireUser } from "@/lib/auth/session";
import { blockedHoursPerWeek } from "@/lib/availability";
import {
  CLUB_PROFILE_STEPS,
  isProfileStep,
  QUICK_PROFILE_STEP,
  type ProfileStep,
} from "@/lib/onboarding/steps";
import { timeZoneLabel } from "@/lib/profile/timezone";
import { personalPalettes, previewTokens } from "@/lib/theme/personal";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { getOnboardingProfile, type OnboardingProfile } from "@/server/onboarding/profile";

import { finishProfileSetup } from "../actions";
import { AvailabilityStep } from "../availability-step";
import { BasicsStep } from "../basics-step";
import { BioStep } from "../bio-step";
import { SchoolStep } from "../school-step";
import { ThemeStep } from "../theme-step";

export const dynamic = "force-dynamic";

/** The stepper's short names, in order. */
const STEP_NAMES: Record<ProfileStep, string> = {
  basics: "About you",
  school: "School",
  bio: "Bio",
  theme: "Theme",
  availability: "Availability",
  review: "Review",
};

/** Each step's question and the line under it. */
const META: Record<ProfileStep, { title: string; description: string }> = {
  basics: {
    title: "Quick profile.",
    description: "Your name and photo, so people know who you are. That's all for now.",
  },
  school: {
    title: "What do you study?",
    description: "What you study, and what you do in the club.",
  },
  bio: {
    title: "A line about you.",
    description: "And where to find you. The link type is detected from the URL.",
  },
  theme: {
    title: "Pick your colours.",
    description: "Only changes your view. Each theme has a light and a dark set.",
  },
  availability: {
    title: "When can't you meet?",
    description: "Mark the hours you can't meet. Teammates only ever see “busy,” never why.",
  },
  review: {
    title: "Everything look right?",
    description: "You can change any of it later on your profile.",
  },
};

/** The theme and availability editors need the card's full width. */
const WIDE: ReadonlySet<ProfileStep> = new Set(["theme", "availability"]);

/**
 * Profile setup (onboarding Flow A): one step per page, so the flow
 * survives a refresh and the back button, and every step saves as the
 * member presses Continue.
 */
export default async function ProfileStepPage({ params }: PageProps<"/onboarding/profile/[step]">) {
  const { step } = await params;
  if (!isProfileStep(step)) notFound();
  const user = await requireUser();
  const profile = await getOnboardingProfile(user.id);
  if (!profile) redirect("/auth/session-ended");

  // The quick profile is one page in the three steps in; the club profile
  // is its own five-step run, which saves as it goes and can be left any time.
  const quick = step === QUICK_PROFILE_STEP;
  const steps = quick
    ? ["Your account", "Quick profile", "Join or start a club"]
    : CLUB_PROFILE_STEPS.map((s) => STEP_NAMES[s]);
  const index = quick ? 2 : (CLUB_PROFILE_STEPS as readonly ProfileStep[]).indexOf(step) + 1;
  const total = quick ? 3 : CLUB_PROFILE_STEPS.length;
  const meta = META[step];

  return (
    <SetupShell
      subject={quick ? "your profile" : "your club profile"}
      steps={steps}
      current={index}
      exit={
        quick ? (
          <SignOutButton className="text-ink-muted hover:text-ink h-auto p-0 text-[14px] font-semibold hover:bg-transparent" />
        ) : (
          <Link
            href="/onboarding"
            className="text-ink-muted hover:text-ink text-[14px] font-semibold"
          >
            Save and exit
          </Link>
        )
      }
    >
      <SetupCard preview={WIDE.has(step) ? undefined : <ProfilePreview profile={profile} />}>
        <StepIntro index={index} total={total} title={meta.title}>
          {meta.description}
        </StepIntro>
        {!profile.emailVerified && quick && (
          <div className="mt-4">
            <VerifyEmailNotice
              email={profile.email}
              action="join or start a club. You can set up your profile in the meantime"
            />
          </div>
        )}
        <div className="mt-[22px] flex flex-1 flex-col">
          <StepBody step={step} profile={profile} />
        </div>
      </SetupCard>
    </SetupShell>
  );
}

/**
 * The preview: the member card teammates will see, from what's saved so
 * far. It fills in as each step saves.
 */
function ProfilePreview({ profile }: { profile: OnboardingProfile }) {
  const subtitle = [profile.pronouns, zoneShort(profile.timezone)].filter(Boolean).join(" · ");
  const school = [profile.major, profile.gradYear ? `Class of ${profile.gradYear}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <PreviewHeader meta="Your profile card" />
      <PreviewTile className="gap-3.5 p-5">
        <div className="flex items-center gap-3">
          <UserAvatar
            user={{
              name: profile.name,
              email: profile.email,
              image: profile.image,
              avatar: profile.avatar,
            }}
            size="lg"
            className="shrink-0"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[16px] font-bold">{profile.name ?? profile.email}</span>
            {subtitle && <span className="text-ink-soft text-[13px]">{subtitle}</span>}
          </span>
        </div>
        {profile.preferredTitle && (
          <span className="bg-oat w-fit rounded-full px-2.5 py-1 text-[12px] font-semibold">
            {profile.preferredTitle}
          </span>
        )}
        {school && <span className="text-ink-muted text-[14px]">{school}</span>}
        {profile.bio && (
          <p className="text-ink-muted m-0 text-[14px] leading-[1.5] whitespace-pre-line">
            {profile.bio}
          </p>
        )}
        {profile.links.length > 0 && (
          <span className="text-ink-soft text-[13px]">
            {profile.links.length} {profile.links.length === 1 ? "link" : "links"}
          </span>
        )}
      </PreviewTile>
      <p className="text-ink-faint m-0 mt-auto text-[12px] leading-[1.5]">
        Your card fills in as you go. Change any of it later on your profile.
      </p>
    </>
  );
}

function StepBody({ step, profile }: { step: ProfileStep; profile: OnboardingProfile }) {
  switch (step) {
    case "basics":
      return (
        <BasicsStep
          user={{
            name: profile.name,
            email: profile.email,
            image: profile.image,
            avatar: profile.avatar,
          }}
          initial={{
            name: profile.name ?? "",
            pronouns: profile.pronouns ?? "",
            timezone: profile.timezone,
          }}
        />
      );
    case "school":
      return (
        <SchoolStep
          initial={{
            major: profile.major,
            gradYear: profile.gradYear,
            preferredTitle: profile.preferredTitle,
          }}
        />
      );
    case "bio":
      return <BioStep initial={{ bio: profile.bio, links: profile.links }} />;
    case "theme":
      return <ThemeStep initial={profile.themePreference} />;
    case "availability":
      return <AvailabilityStep initial={profile.availability} />;
    case "review":
      return <Review profile={profile} />;
  }
}

function zoneShort(zone: string | null): string {
  if (!zone) return "";
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return part ?? timeZoneLabel(zone);
  } catch {
    return zone;
  }
}

/** A6 · Review, then A7's branch: join with an invite code, or create an org. */
function Review({ profile }: { profile: OnboardingProfile }) {
  const theme = profile.themePreference;
  const palettes = theme ? personalPalettes(theme) : null;
  const colors =
    palettes && theme ? previewTokens(palettes, theme.mode === "light" ? "light" : "dark") : null;
  const themeName = theme
    ? theme.preset === "custom"
      ? "Custom"
      : (THEME_PRESETS.find((p) => p.id === theme.preset)?.name ?? "Default")
    : "Match my club";
  const modeName =
    theme?.mode === "light" ? "Light" : theme?.mode === "dark" ? "Dark" : theme ? "Auto" : null;
  const subtitle = [profile.pronouns, zoneShort(profile.timezone)].filter(Boolean).join(" · ");
  const home = profile.memberships[0];
  const blocked = blockedHoursPerWeek(profile.availability);

  const rows: { icon: LucideIcon; label: string; value: React.ReactNode; edit: ProfileStep }[] = [
    { icon: BookOpen, label: "Major", value: profile.major ?? "—", edit: "school" },
    { icon: GraduationCap, label: "Grad year", value: profile.gradYear ?? "—", edit: "school" },
    { icon: BadgeCheck, label: "Role", value: profile.preferredTitle ?? "—", edit: "school" },
    {
      icon: Link2,
      label: "Links",
      value: profile.links.length === 0 ? "None yet" : `${profile.links.length} added`,
      edit: "bio",
    },
    { icon: CalendarX, label: "Can't meet", value: `${blocked} hrs a week`, edit: "availability" },
    {
      icon: Palette,
      label: "Theme",
      value: (
        <span className="inline-flex items-center gap-1.5">
          {colors && (
            <span className="size-2.5 rounded-full" style={{ background: colors.primary }} />
          )}
          {themeName}
          {modeName ? ` · ${modeName}` : ""}
        </span>
      ),
      edit: "theme",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="bg-muted/40 flex items-center gap-3.5 rounded-xl border p-3.5">
        <UserAvatar
          user={{
            name: profile.name,
            email: profile.email,
            image: profile.image,
            avatar: profile.avatar,
          }}
          size="lg"
          className="ring-background shrink-0 ring-2"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">{profile.name ?? profile.email}</div>
          {subtitle && <div className="text-muted-foreground text-sm">{subtitle}</div>}
        </div>
        <Link
          href="/onboarding/profile/basics"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        >
          Edit
        </Link>
      </div>

      <dl className="divide-y rounded-xl border">
        {rows.map((row) => (
          <div key={row.label} className="group flex items-center gap-3 px-3.5 py-2.5 text-sm">
            <row.icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <dt className="text-muted-foreground w-24 shrink-0">{row.label}</dt>
            <dd className="min-w-0 flex-1 truncate font-medium">{row.value}</dd>
            <Link
              href={`/onboarding/profile/${row.edit}`}
              className="text-muted-foreground hover:text-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              Edit
            </Link>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <span className="text-sm font-medium">What&apos;s next?</span>
        {home ? (
          <form action={finishProfileSetup.bind(null, "home")}>
            <button type="submit" className={choiceTileClass}>
              <ChoiceTileBody
                icon={Building2}
                primary
                title={`Go to ${home.name}`}
                detail="You're already a member."
              />
            </button>
          </form>
        ) : (
          <>
            <form action={finishProfileSetup.bind(null, "join")}>
              <button type="submit" className={choiceTileClass}>
                <ChoiceTileBody
                  icon={KeyRound}
                  primary
                  title="Join with a club code"
                  detail="An officer shared a code or a link, or emailed you an invite."
                />
              </button>
            </form>
            <form action={finishProfileSetup.bind(null, "create")}>
              <button type="submit" className={choiceTileClass}>
                <ChoiceTileBody
                  icon={Building2}
                  title="Start a new club"
                  detail="Set up a workspace for your club. You'll be its admin."
                />
              </button>
            </form>
          </>
        )}
      </div>
      <StepFooter back={{ href: "/onboarding/profile/availability" }}>{null}</StepFooter>
    </div>
  );
}
