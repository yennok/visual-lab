import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Phase 0 stub. The route is gated by middleware (see src/middleware.ts), so an
// unauthenticated request never reaches this handler. Phase 1 wires the real
// pipeline: buildBrandPrompt() → generateImage() → Blob put() → Generation row.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Not implemented yet — image generation ships in Phase 1." },
    { status: 501 }
  );
}
