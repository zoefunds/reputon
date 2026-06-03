import { cn } from "@/lib/utils";

export function EmptyState({
 title,
 body,
 icon,
 action,
 className,
}: {
 title: string;
 body: string;
 icon?: React.ReactNode;
 action?: React.ReactNode;
 className?: string;
}) {
 return (
 <div
 className={cn(
 "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card p-10 text-center",
 className
 )}
 >
 {icon && (
 <div className="grid h-10 w-10 place-items-center rounded-md border border-border bg-background text-foreground">
 {icon}
 </div>
 )}
 <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
 {title}
 </h3>
 <p className="max-w-sm text-[13px] text-accent">{body}</p>
 {action}
 </div>
 );
}
