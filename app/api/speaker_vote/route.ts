import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/shared/better-auth/auth";

import { db } from "@/shared/db";
import { speakerVoteTGTable } from "@/shared/db/schema";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await db
      .select({
        video: speakerVoteTGTable.voted_for_id,
        total: sql<number>`count(*)`,
      })
      .from(speakerVoteTGTable)
      .groupBy(speakerVoteTGTable.voted_for_id);

    return NextResponse.json(results, { status: 200 });
  } catch (err) {
    console.error("API Error fetching vote results:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
