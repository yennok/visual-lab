import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// Token endpoint for client-side uploads of brand reference images.
// The browser uploads straight to Vercel Blob (avoiding the 4.5MB server-body
// limit); this route only mints a scoped token after checking auth. The DB row
// is created separately by the addReference server action (onUploadCompleted
// does not fire on localhost).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");
        return {
          allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
        };
      },
      onUploadCompleted: async () => {
        // No-op: reference rows are persisted via the addReference action.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
