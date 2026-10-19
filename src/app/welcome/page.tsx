import { redirect } from "next/navigation";
import { Onboarding } from "@/components/Onboarding";
import { isSupabaseConfigured } from "@/lib/env";
import { getUser } from "@/server/queries";

export default async function WelcomePage() {
  if (isSupabaseConfigured() && (await getUser())) redirect("/home");
  return <Onboarding />;
}
