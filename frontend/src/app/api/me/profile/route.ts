import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/user";

export async function GET() {
 const u = await getCurrentUser();
 if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
 return NextResponse.json(u);
}
