import { redirect } from "next/navigation";

export default function SignUpPage() {
  // Single unified flow — sign-in handles new users transparently.
  redirect("/sign-in");
}
