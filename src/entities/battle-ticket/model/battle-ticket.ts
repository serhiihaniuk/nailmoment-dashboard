import { z } from "zod";
import { paymentTypeEnum } from "@/shared/db/schema";

const nonEmptyStringSchema = z.string().trim().min(1);
const dateSchema = z.coerce.date();

export const battleTicketIdSchema =
  nonEmptyStringSchema.brand<"BattleTicketId">();
export type BattleTicketId = z.infer<typeof battleTicketIdSchema>;

/** Parse an untrusted route/API value into a Battle Ticket id. */
export function parseBattleTicketId(value: unknown): BattleTicketId {
  return battleTicketIdSchema.parse(value);
}

export const battleTicketPaymentTypeSchema = z.enum(paymentTypeEnum.enumValues);
export type BattleTicketPaymentType = z.infer<
  typeof battleTicketPaymentTypeSchema
>;

export const battleTicketOriginSchema = z.enum(["manual", "stripe"]);
export type BattleTicketOrigin = z.infer<typeof battleTicketOriginSchema>;

export const battleTicketDeliveryStatusSchema = z.enum([
  "pending",
  "handed_off",
]);
export type BattleTicketDeliveryStatus = z.infer<
  typeof battleTicketDeliveryStatusSchema
>;

export function getBattleTicketOrigin(
  stripeEventId: string
): BattleTicketOrigin {
  return stripeEventId.startsWith("manual_battle_") ? "manual" : "stripe";
}

export function getBattleTicketDeliveryStatus(
  mailSent: boolean
): BattleTicketDeliveryStatus {
  return mailSent ? "handed_off" : "pending";
}

const battleTicketBaseSchema = z.object({
  archived: z.boolean(),
  comment: z.string(),
  date: dateSchema,
  email: z.string(),
  id: battleTicketIdSchema,
  instagram: z.string(),
  mail_sent: z.boolean(),
  name: z.string(),
  nomination_quantity: z.number().int().nonnegative(),
  payment_type: battleTicketPaymentTypeSchema,
  phone: z.string(),
  photos_sent: z.boolean(),
  stripe_event_id: nonEmptyStringSchema,
});

export const battleTicketSchema = battleTicketBaseSchema.transform(
  (battleTicket) => ({
    ...battleTicket,
    delivery_status: getBattleTicketDeliveryStatus(battleTicket.mail_sent),
    origin: getBattleTicketOrigin(battleTicket.stripe_event_id),
  })
);

export const battleTicketListSchema = z.array(battleTicketSchema);

export const addBattleTicketSuccessSchema = z.object({
  battleTicket: battleTicketSchema,
  mailError: z.string().nullable(),
  mailSent: z.boolean(),
});

export type BattleTicket = z.infer<typeof battleTicketSchema>;
export type BattleTicketList = z.infer<typeof battleTicketListSchema>;
export type AddBattleTicketSuccess = z.infer<
  typeof addBattleTicketSuccessSchema
>;

export type ManualBattleTicket = BattleTicket & { origin: "manual" };
export type StripeBattleTicket = BattleTicket & { origin: "stripe" };
export type SoftDeletedBattleTicket = BattleTicket & { archived: true };

/** Parse a single Battle Ticket API response before a widget consumes it. */
export function parseBattleTicket(value: unknown): BattleTicket {
  return battleTicketSchema.parse(value);
}

/** Parse the Battle Ticket list returned by the battle page API read. */
export function parseBattleTicketList(value: unknown): BattleTicket[] {
  return battleTicketListSchema.parse(value);
}

/** Parse the manual Battle Ticket creation response shape. */
export function parseAddBattleTicketSuccess(
  value: unknown
): AddBattleTicketSuccess {
  return addBattleTicketSuccessSchema.parse(value);
}

export function isManualBattleTicket(
  battleTicket: BattleTicket
): battleTicket is ManualBattleTicket {
  return battleTicket.origin === "manual";
}

export function isStripeBattleTicket(
  battleTicket: BattleTicket
): battleTicket is StripeBattleTicket {
  return battleTicket.origin === "stripe";
}

export function isSoftDeletedBattleTicket(
  battleTicket: BattleTicket
): battleTicket is SoftDeletedBattleTicket {
  return battleTicket.archived;
}
