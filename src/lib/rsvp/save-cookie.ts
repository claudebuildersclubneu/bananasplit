/**
 * "Save to a club" when the person has no club yet: the free event waits in
 * this cookie while they start one, and creating the club moves it in
 * (src/app/rsvp/actions.ts sets it, src/app/onboarding/actions.ts reads it).
 */
export const PENDING_SAVE_COOKIE = "bs-rsvp-save";
