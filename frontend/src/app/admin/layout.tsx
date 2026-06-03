import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getCurrentUser } from "@/lib/server/user";

export default async function AdminLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const user = await getCurrentUser();
 if (!user) redirect("/sign-in?callbackUrl=/admin");
 if (user.role !== "admin") {
 // Hard 404-style block. Returning notFound() would also work; redirect to
 // dashboard keeps the UX coherent for a non-admin who clicked an admin link.
 redirect("/dashboard");
 }
 return (
 <div className="flex min-h-[calc(100vh-3.5rem)]">
 <AdminSidebar />
 <div className="flex-1">{children}</div>
 </div>
 );
}
