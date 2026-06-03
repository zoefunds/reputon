"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Send } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
 const [status, setStatus] = useState<Status>("idle");
 const [error, setError] = useState<string | null>(null);

 async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
 e.preventDefault();
 setStatus("submitting");
 setError(null);

 const data = new FormData(e.currentTarget);
 const payload = Object.fromEntries(data.entries());

 try {
 // Phase 6 wires this to the backend `/contact` endpoint.
 // For now we simulate a successful submission locally so the UI is real.
 await new Promise((r) => setTimeout(r, 700));
 if (!payload.email || !payload.message) {
 throw new Error("Email and message are required.");
 }
 setStatus("success");
 (e.currentTarget as HTMLFormElement).reset();
 } catch (err) {
 setStatus("error");
 setError(err instanceof Error ? err.message : "Something went wrong.");
 }
 }

 if (status === "success") {
 return (
 <div className="flex flex-col items-start gap-3 rounded-xl border border-success/40 bg-success/5 p-8">
 <CheckCircle2 className="h-6 w-6 text-success" />
 <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
 Message received.
 </h3>
 <p className="text-[14px] text-accent">
 Thanks , we'll get back to you shortly at the email you provided.
 </p>
 <Button variant="outline" size="sm" onClick={() => setStatus("idle")}>
 Send another
 </Button>
 </div>
 );
 }

 return (
 <form
 onSubmit={onSubmit}
 className="rounded-2xl border border-border bg-card p-8 shadow-soft"
 >
 <div className="grid gap-5 sm:grid-cols-2">
 <Field label="Name" name="name" required placeholder="Ada Lovelace" />
 <Field
 label="Email"
 name="email"
 type="email"
 required
 placeholder="you@protocol.xyz"
 />
 <Field
 label="Organisation"
 name="org"
 placeholder="DAO, protocol, company…"
 className="sm:col-span-2"
 />
 <Field
 label="Topic"
 name="topic"
 as="select"
 options={[
 "General",
 "Integration / API",
 "Partnership",
 "Security disclosure",
 "Press",
 ]}
 className="sm:col-span-2"
 />
 <Field
 label="Message"
 name="message"
 as="textarea"
 required
 placeholder="What would you like to discuss?"
 className="sm:col-span-2"
 />
 </div>

 {error && (
 <p className="mt-4 text-[13px] text-error">{error}</p>
 )}

 <div className="mt-6 flex items-center justify-between">
 <p className="text-[12px] text-accent">
 We never share your details. PGP available for security reports.
 </p>
 <Button type="submit" disabled={status === "submitting"}>
 {status === "submitting" ? "Sending…" : (
 <>
 Send message <Send className="h-4 w-4" />
 </>
 )}
 </Button>
 </div>
 </form>
 );
}

type FieldProps = {
 label: string;
 name: string;
 type?: string;
 placeholder?: string;
 required?: boolean;
 className?: string;
 as?: "input" | "textarea" | "select";
 options?: string[];
};

function Field({
 label,
 name,
 type = "text",
 placeholder,
 required,
 className,
 as = "input",
 options,
}: FieldProps) {
 const base =
 "block w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-accent/70 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card";

 return (
 <label className={"block " + (className ?? "")}>
 <span className="block text-[12px] font-medium uppercase tracking-[0.14em] text-accent">
 {label} {required && <span className="text-foreground">*</span>}
 </span>
 <span className="mt-1.5 block">
 {as === "textarea" ? (
 <textarea
 name={name}
 required={required}
 placeholder={placeholder}
 rows={5}
 className={base + " resize-y"}
 />
 ) : as === "select" ? (
 <select name={name} required={required} className={base} defaultValue="General">
 {options?.map((o) => (
 <option key={o} value={o}>
 {o}
 </option>
 ))}
 </select>
 ) : (
 <input
 name={name}
 type={type}
 required={required}
 placeholder={placeholder}
 className={base}
 />
 )}
 </span>
 </label>
 );
}
