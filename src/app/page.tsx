import { redirect } from "next/navigation";
import { getUser } from "@/server/queries";

export default async function Index() {
  const user = await getUser();
  redirect(user ? "/home" : "/welcome");
}
