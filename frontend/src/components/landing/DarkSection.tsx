import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export function DarkSection({
  className,
  containerClassName,
  children,
}: {
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "bg-primary text-primary-foreground py-20 sm:py-24",
        className
      )}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
