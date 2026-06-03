import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getCurrentUser } from "@/lib/server/user";

export default async function DashboardLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const user = await getCurrentUser();
 if (!user) {
 redirect("/sign-in?callbackUrl=/dashboard");
 }
 return (
 <div className="flex min-h-[calc(100vh-3.5rem)]">
 <Sidebar />
 <div className="flex-1">{children}</div>
 </div>
 );
}
