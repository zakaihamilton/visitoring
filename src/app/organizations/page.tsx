import { redirect } from "next/navigation";

export default function OrganizationsPage(): never {
  redirect("/auth/organization/default");
}
