import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLElement> & {
  bordered?: boolean;
  containerClassName?: string;
};

export function Section({
  bordered,
  className,
  containerClassName,
  children,
  ...rest
}: Props) {
  return (
    <section
      className={cn(
        "py-20 sm:py-24",
        bordered && "border-t border-border/60",
        className
      )}
      {...rest}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
