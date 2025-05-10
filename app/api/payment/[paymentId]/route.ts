// app/api/payment/[paymentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { createPaymentInstallmentService } from "@/shared/db/service/payment-installment-service";
import { auth } from "@/shared/better-auth/auth";
import { headers } from "next/headers";
import {
  PatchPaymentInstallment,
  patchPaymentInstallmentSchema,
} from "@/shared/db/schema.zod";
import { z } from "zod";

const paymentInstallmentService = createPaymentInstallmentService(db);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const paymentId = resolvedParams.paymentId;

  if (!paymentId) {
    return NextResponse.json(
      { message: "Payment ID is required" },
      { status: 400 }
    );
  }

  const body = (await req.json()) ?? {};
  let patchData: PatchPaymentInstallment;

  try {
    patchData = patchPaymentInstallmentSchema.parse(body);
  } catch (e) {
    return NextResponse.json(
      { message: "Validation failed", issues: (e as z.ZodError).issues },
      { status: 400 }
    );
  }

  if (Object.keys(patchData).length === 0) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  try {
    const updatedPayment =
      await paymentInstallmentService.updatePaymentInstallment(
        paymentId,
        patchData
      );

    return updatedPayment
      ? NextResponse.json(updatedPayment)
      : NextResponse.json(
          { message: "Payment installment not found" },
          { status: 404 }
        );
  } catch (error) {
    console.error(`PATCH /api/payment/${paymentId} failed:`, error);
    return NextResponse.json(
      { message: "Server error while updating payment installment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const paymentId = resolvedParams.paymentId;

  if (!paymentId) {
    return NextResponse.json(
      { message: "Payment ID is required" },
      { status: 400 }
    );
  }

  try {
    const deletedPaymentInfo =
      await paymentInstallmentService.deletePaymentInstallment(paymentId);

    if (!deletedPaymentInfo) {
      return NextResponse.json(
        { message: "Payment installment not found or could not be deleted" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        message: "Payment installment deleted successfully",
        id: deletedPaymentInfo.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`DELETE /api/payment/${paymentId} failed:`, error);
    return NextResponse.json(
      { message: "Server error while deleting payment installment" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
