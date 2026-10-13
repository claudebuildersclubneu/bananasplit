import { redirect } from "next/navigation";

/** /onboarding/profile starts at step 1, About you. */
export default function ProfileSetupIndex() {
  redirect("/onboarding/profile/basics");
}
