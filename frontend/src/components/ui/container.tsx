import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLDivElement> & {
 size?: "tight" | "wide";
};

export function Container({ size = "wide", className, ...props }: Props) {
 return (
 <div
 className={cn(
 size === "tight" ? "container-tight" : "container-wide",
 className
 )}
 {...props}
 />
 );
}
