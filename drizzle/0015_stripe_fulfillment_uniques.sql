ALTER TABLE "battle_ticket" ADD CONSTRAINT "battle_ticket_stripe_event_id_unique" UNIQUE("stripe_event_id");--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_stripe_event_id_unique" UNIQUE("stripe_event_id");
