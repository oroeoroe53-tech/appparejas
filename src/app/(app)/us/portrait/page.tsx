import { redirect } from "next/navigation";

/** The big portrait is now the home page itself. Old links and bookmarks land there. */
export default function PortraitPage() {
  redirect("/home");
}
