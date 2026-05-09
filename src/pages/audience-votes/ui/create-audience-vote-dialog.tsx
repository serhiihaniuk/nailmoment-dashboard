"use client";

import type { ReactNode } from "react";
import { CalendarClock, Loader2, Plus } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  audienceVoteKindOptions,
  createAudienceVoteStatusOptions,
} from "../model/audience-vote-form";
import { useCreateAudienceVoteDialog } from "../model/use-create-audience-vote-dialog";

export function CreateAudienceVoteDialog() {
  const {
    draft,
    errors,
    formError,
    handleOpenChange,
    handleSubmit,
    isPending,
    open,
    updateDraft,
    updateKind,
    updateStatus,
  } = useCreateAudienceVoteDialog();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden="true" size={14} />
          Нове голосування
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>Створити голосування</DialogTitle>
          <DialogDescription>
            Підготуйте чернетку або запланований етап голосування для Mini App.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Публічна назва" message={errors.title}>
            <Input
              disabled={isPending}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="Голосування за спікера головної сцени"
              value={draft.title}
            />
          </Field>

          <div className="grid gap-4">
            <Field label="Тип" message={errors.kind}>
              <Select
                disabled={isPending}
                onValueChange={updateKind}
                value={draft.kind}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audienceVoteKindOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Статус" message={errors.status}>
              <Select
                disabled={isPending}
                onValueChange={updateStatus}
                value={draft.status}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createAudienceVoteStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Початок" message={errors.window_start}>
              <div className="relative min-w-0 overflow-hidden">
                <CalendarClock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <Input
                  className="block min-w-0 max-w-full min-inline-0 max-inline-full appearance-none overflow-hidden pl-9 pr-3 inline-full"
                  disabled={isPending}
                  onChange={(event) =>
                    updateDraft("window_start", event.target.value)
                  }
                  type="datetime-local"
                  value={draft.window_start}
                />
              </div>
            </Field>

            <Field label="Завершення" message={errors.window_end}>
              <div className="relative min-w-0 overflow-hidden">
                <CalendarClock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <Input
                  className="block min-w-0 max-w-full min-inline-0 max-inline-full appearance-none overflow-hidden pl-9 pr-3 inline-full"
                  disabled={isPending}
                  onChange={(event) =>
                    updateDraft("window_end", event.target.value)
                  }
                  type="datetime-local"
                  value={draft.window_end}
                />
              </div>
            </Field>
          </div>

          {formError ? (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          ) : null}

          <DialogFooter>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : null}
              Створити
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  children,
  label,
  message,
}: {
  children: ReactNode;
  label: string;
  message?: string | undefined;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label>{label}</Label>
      {children}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
