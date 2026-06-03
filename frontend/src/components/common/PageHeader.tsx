import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

type Props = {
 kicker?: string;
 title: string;
 description?: string;
 align?: "left" | "center";
 className?: string;
};

export function PageHeader({
 kicker,
 title,
 description,
 align = "left",
 className,
}: Props) {
 return (
 <section className={cn("border-b border-border/60 pt-20 pb-16 sm:pt-24 sm:pb-20", className)}>
 <Container>
 <div
 className={cn(
 "max-w-3xl",
 align === "center" && "mx-auto text-center"
 )}
 >
 {kicker && (
 <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
 {kicker}
 </p>
 )}
 <h1 className="mt-3 text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tightest text-foreground sm:text-5xl">
 {title}
 </h1>
 {description && (
 <p className="mt-5 text-balance text-[17px] leading-relaxed text-accent">
 {description}
 </p>
 )}
 </div>
 </Container>
 </section>
 );
}
