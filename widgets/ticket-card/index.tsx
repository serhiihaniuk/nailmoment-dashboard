"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatInstagramLink, linkStyles } from "@/shared/utils";
import {
  Loader2,
  AlertTriangle,
  Ghost,
  Mail,
  Phone,
  Instagram,
  User,
  BadgeCheck,
  CalendarClock,
  ArrowBigDownDashIcon,
  ArrowRight,
  Text,
  FileText,
  Check,
  X,
} from "lucide-react";
import { UpdateTicketInput } from "@/shared/db/schema.zod";
import { EditTicketDialog } from "@/features/edit-ticket";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import Link from "next/link";
import { TicketWithPayments } from "@/shared/db/service/ticket-service";
import { TicketPayments } from "./ticket-payment";
import { Badge } from "@/components/ui/badge";
import { DetailGrid, DetailItem } from "@/components/ui/detail-grid";

async function fetchTicket(id: string): Promise<TicketWithPayments | null> {
  const r = await fetch(`/api/ticket/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function patchTicket(
  id: string,
  patch: UpdateTicketInput
): Promise<TicketWithPayments> {
  const r = await fetch(`/api/ticket/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function patchArrived(
  id: string,
  arrived: boolean
): Promise<TicketWithPayments> {
  return patchTicket(id, { arrived });
}

interface TicketDetailsProps {
  ticket: TicketWithPayments;
}

const TicketDetails: React.FC<TicketDetailsProps> = ({ ticket }) => (
  <div className="flex flex-col gap-6 w-full">
    <h3 className="text-heading-2 border-b border-border pb-2">Деталі квитка</h3>
    <DetailGrid>
      <DetailItem
        icon={<User />}
        label="Імʼя"
        value={ticket.name}
      />
      <DetailItem
        icon={<Mail />}
        label="Електронна пошта"
        value={
          <Link
            href={`mailto:${ticket.email}`}
            className={cn(linkStyles, "truncate")}
            title={ticket.email}
          >
            {ticket.email}
          </Link>
        }
      />
      <DetailItem
        icon={<Instagram />}
        label="Instagram"
        value={
          ticket.instagram ? (
            <a
              href={formatInstagramLink(ticket.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              className={linkStyles}
            >
              @{ticket.instagram}
            </a>
          ) : (
            "-"
          )
        }
      />
      <DetailItem
        icon={<Phone />}
        label="Телефон"
        value={
          <Link
            href={`tel:${ticket.phone.replace(/\s+/g, "")}`}
            className={linkStyles}
          >
            {ticket.phone.replace(/\s+/g, "")}
          </Link>
        }
      />
      <DetailItem
        icon={<BadgeCheck />}
        label="Тип"
        value={
          <span className="flex items-center gap-2">
            <TicketTypeBadge type={ticket.grade} />
            {ticket.updated_grade && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <TicketTypeBadge type={ticket.updated_grade} />
              </>
            )}
          </span>
        }
      />
      <DetailItem
        icon={<CalendarClock />}
        label="Дата покупки"
        value={new Date(ticket.date).toLocaleDateString("uk-UA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      />
      <DetailItem
        icon={
          <ArrowBigDownDashIcon />
        }
        label="Прибув(ла)"
        value={
          ticket.arrived ? (
            <Check size={18} className="text-success" />
          ) : (
            <X size={18} className="text-destructive" />
          )
        }
      />
      <DetailItem
        icon={<Text />}
        label="Коментар"
        value={ticket.comment || "-"}
      />
      <DetailItem
        icon={<FileText />}
        label="QR Квиток"
        value={
          <Link
            href={`/pdf/${ticket.id}`}
            className={linkStyles}
            target="_blank"
            rel="noopener noreferrer"
          >
            Переглянути/Завантажити
          </Link>
        }
      />
    </DetailGrid>
  </div>
);

interface LoadingStateProps {
  height?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ height = "h-60" }) => (
  <div
    className={cn("flex flex-col items-center gap-2 justify-center", height)}
  >
    <Skeleton className="h-full w-full flex items-center justify-center">
      <Loader2 className="animate-spin" size={24} />
    </Skeleton>
  </div>
);

const ErrorState: React.FC<{ message: string; height?: string }> = ({
  message,
  height = "h-60",
}) => (
  <div
    className={cn(
      "flex items-center gap-2 text-destructive font-medium justify-center",
      height
    )}
  >
    <AlertTriangle size={20} />
    <span>{message}</span>
  </div>
);

const EmptyState: React.FC<{ message: string; height?: string }> = ({
  message,
  height = "h-60",
}) => (
  <div
    className={cn(
      "flex items-center gap-2 text-muted-foreground justify-center",
      height
    )}
  >
    <Ghost size={20} />
    <span>{message}</span>
  </div>
);

export function TicketCard({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isFetching, isError, error } = useQuery<
    TicketWithPayments | null,
    Error
  >({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const arrivedMutation = useMutation({
    mutationFn: (arrived: boolean) => patchArrived(ticketId, arrived),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const renderContent = () => {
    if (isLoading) return <LoadingState />;
    if (isError)
      return (
        <ErrorState message={error?.message || "Помилка завантаження квитка"} />
      );
    if (data === null) return <EmptyState message="Квиток не знайдено" />;
    if (data) {
      return (
        <>
          <TicketDetails ticket={data} />
          <TicketPayments
            ticketId={ticketId}
            payments={data.paymentInstallments}
          />
        </>
      );
    }
    return null;
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader
        className={cn("transition-colors duration-300", {
          "bg-success/15": data?.arrived && !data?.archived,
          "bg-muted/30": !data?.arrived || data === null || isLoading || isError,
          "bg-destructive/10": data?.archived,
        })}
      >
        <CardTitle className="flex items-center gap-2">
          Квиток {data?.name ? <span className="font-bold underline">{data.name}</span> : "..."}{" "}
          {data?.arrived && <Check size={18} className="text-success" />}
          {data?.archived && <Badge variant="destructive">DELETED</Badge>}
        </CardTitle>
        <CardDescription>#{ticketId.slice(-6)}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 pt-6">{renderContent()}</CardContent>

      {data && (
        <CardFooter className="pt-4 flex gap-2 border-t flex-col md:flex-row items-stretch">
          <EditTicketDialog ticket={data} ticketId={ticketId} />
          {!data.archived && (
            <Button
              variant={data.arrived ? "outline" : "default"}
              disabled={isFetching || arrivedMutation.isPending}
              onClick={() => arrivedMutation.mutate(!data.arrived)}
              className="md:ml-auto"
            >
              {arrivedMutation.isPending || isFetching ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Оновлення...
                </span>
              ) : data.arrived ? (
                "Скасувати прибуття"
              ) : (
                "Позначити як прибув(ла)"
              )}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
