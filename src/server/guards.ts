import "server-only";
import { redirect } from "next/navigation";
import { getAppContext, type AppContext } from "./queries";

/** The signed-in user + their space. Redirects to the connect flow until two people are linked. */
export async function requireSpace(opts: { allowEnded?: boolean } = {}): Promise<AppContext & { space: NonNullable<AppContext["space"]> }> {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  const space = ctx.space;
  if (!space || space.status === "waiting" || (space.status === "ended" && !opts.allowEnded)) redirect("/connect");
  return { ...ctx, space };
}
