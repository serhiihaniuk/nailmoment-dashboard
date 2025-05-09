import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createBattleTicketService } from "@/shared/db/service/battle-ticket-service"; // Ensure this path is correct
import {
  updateBattleTicketSchema,
  UpdateBattleTicketInput, // Ensure this type is exported from schema.zod.ts
} from "@/shared/db/schema.zod"; // Ensure this path is correct

const battleTicketService = createBattleTicketService(db);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const battleTicket = await battleTicketService.getBattleTicket(id);
    if (!battleTicket) {
      return NextResponse.json(
        { message: "Battle ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(battleTicket, { status: 200 });
  } catch (e) {
    console.error("GET /api/battle-ticket/:id failed:", e);
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    let patchData: UpdateBattleTicketInput;
    try {
      patchData = updateBattleTicketSchema.parse(body);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json(
          { message: "Validation failed", errors: e.flatten().fieldErrors },
          { status: 400 }
        );
      }
      // Should not happen if Zod is the only source of parsing errors
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    if (Object.keys(patchData).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const updatedBattleTicket = await battleTicketService.updateBattleTicket(
      id,
      patchData
    );

    if (!updatedBattleTicket) {
      return NextResponse.json(
        { message: "Battle ticket not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedBattleTicket, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/battle-ticket/:id failed:", e);
    // Consider more specific error handling, e.g., for database constraint violations
    const message =
      e instanceof Error ? e.message : "Server error during update";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
