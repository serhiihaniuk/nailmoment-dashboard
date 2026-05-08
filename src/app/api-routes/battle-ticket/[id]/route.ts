import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createBattleTicketService } from "@/shared/db/service/battle-ticket-service";
import {
  updateBattleTicketSchema,
  type UpdateBattleTicketInput,
} from "@/shared/db/schema.zod";
import {
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";
import {
  battleTicketIdSchema,
  parseBattleTicket,
} from "@/entities/battle-ticket";

const battleTicketService = createBattleTicketService(db);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDashboardSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      z.object({ id: battleTicketIdSchema })
    );
    if (!parsedParams.ok) return parsedParams.response;

    const { id } = parsedParams.data;
    const battleTicket = await battleTicketService.getBattleTicket(id);
    if (!battleTicket) {
      return NextResponse.json(
        { message: "Battle ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(parseBattleTicket(battleTicket), {
      status: 200,
    });
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
    const session = await getDashboardSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      z.object({ id: battleTicketIdSchema })
    );
    if (!parsedParams.ok) return parsedParams.response;

    const parsedBody = await parseRequestJson(req, updateBattleTicketSchema, {
      errorFormat: "fieldErrors",
    });
    if (!parsedBody.ok) return parsedBody.response;

    const { id } = parsedParams.data;
    const patchData: UpdateBattleTicketInput = parsedBody.data;

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

    return NextResponse.json(parseBattleTicket(updatedBattleTicket), {
      status: 200,
    });
  } catch (e) {
    console.error("PATCH /api/battle-ticket/:id failed:", e);
    const message =
      e instanceof Error ? e.message : "Server error during update";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
