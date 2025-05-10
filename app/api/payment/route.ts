import { NextRequest, NextResponse } from "next/server";
import { insertPaymentInstallmentApiInputSchema } from "@/shared/db/schema.zod";
import { db } from "@/shared/db";
import { createPaymentInstallmentService } from "@/shared/db/service/payment-installment-service";

const paymentService = createPaymentInstallmentService(db);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = insertPaymentInstallmentApiInputSchema.parse(body);
    const payment = await paymentService.addPaymentInstallment(data);

    return NextResponse.json(payment, { status: 201 }); // 201 Created
  } catch (err) {
    return NextResponse.json(
      { message: (err as Error).message },
      { status: 400 }
    );
  }
}
