"use server";

import { redirect } from "next/navigation";
import { destroyAuthSession } from "@/lib/auth";

export async function logoutAction(): Promise<void> {
  await destroyAuthSession();
  redirect("/login?loggedOut=1");
}
