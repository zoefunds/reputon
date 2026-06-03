import { Container } from "@/components/ui/container";
import { getRecentUsers } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  const users = await getRecentUsers(100);
  return (
    <Container className="space-y-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          Users
        </h1>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b border-border/70 bg-foreground/[0.03] text-left">
            <tr className="text-[11px] uppercase tracking-[0.14em] text-accent">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-accent">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/40 last:border-b-0">
                <td className="px-4 py-3">
                  <p className="text-foreground">{u.name ?? "—"}</p>
                  <p className="font-mono text-[11px] text-accent">{u.id}</p>
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-foreground/80">
                  {u.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] " +
                      (u.role === "admin"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-accent")
                    }
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-accent">
                  {new Date(u.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-[12px] text-accent">
        Promote a user to admin from the terminal:{" "}
        <code className="font-mono text-foreground">
          npm --workspace backend run promote-admin -- &lt;email&gt;
        </code>
      </p>
    </Container>
  );
}
