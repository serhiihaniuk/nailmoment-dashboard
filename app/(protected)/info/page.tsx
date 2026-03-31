"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/utils";

const CHECKIN_STEPS = [
  "Гість показує QR-код → скануєте камерою → відкривається сторінка квитка.",
  "Перевіряєте ім'я та тип квитка: Standard або VIP.",
  "Натискаєте «Позначити прибуття».",
  "Зелений статус «Прибув(ла)» = готово, можна переходити до наступного гостя.",
] as const;

const STATUS_ITEMS = [
  {
    label: "Прибув(ла)",
    description: "Гість зареєстрований і вже пройшов check-in.",
    tone: "bg-[#1a7f37]",
  },
  {
    label: "Не прибув(ла)",
    description: "Гість ще не з'явився або check-in ще не проведено.",
    tone: "bg-[#cccccc]",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "Помилково позначили прибуття",
    answer:
      "Відкрийте квиток і натисніть «Скасувати прибуття».",
  },
  {
    question: "QR-код не сканується",
    answer:
      "Знайдіть гостя через пошук за ім'ям, телефоном або email.",
  },
  {
    question: "QR-код не відображається у квитку",
    answer:
      "У квитку має бути ID-код. Знайдіть гостя по цьому коду або через ім'я, телефон чи email.",
  },
  {
    question: "Не можу увійти в систему",
    answer:
      "Зверніться до колег, які мають доступ, або до організатора на місці.",
  },
] as const;

const SEARCH_RULES = [
  "Пошук не чутливий до регістру.",
  "На сторінці квитків пошук перевіряє код квитка, ім'я, email, телефон та Instagram.",
  "На сторінці батлу пошук перевіряє код учасника, ім'я, email, телефон, Instagram та коментар.",
  "Для коду та email працює також fuzzy-пошук за послідовністю символів. Символи можуть бути не підряд.",
  "Якщо у вас є QR/PDF-посилання, можна шукати по коду з нього. Вводити повний URL не потрібно.",
  "Якщо QR-код не відображається, шукайте по ID-коду з квитка або по імені, телефону чи email.",
  "Для коду та email не обов'язково дотримуватись регістру або вводити спеціальні символи на кшталт `_`, `-`, `.` чи `@`.",
  "Фільтри зверху працюють разом із пошуком і додатково звужують результат.",
] as const;

const SEARCH_EXAMPLES = [
  {
    query: "qaCA_9",
    result: "Знайде квиток або учасника з кодом `qaCA_9`.",
  },
  {
    query: "qaca9",
    result: "Теж знайде код `qaCA_9`: регістр і `_` не є обов'язковими.",
  },
  {
    query: "aca9",
    result: "Теж знайде `qaCA_9`, бо для коду працює пошук по послідовності символів.",
  },
  {
    query: "namegmailcom",
    result: "Знайде email `name@gmail.com`, навіть без `@` і крапки.",
  },
  {
    query: "bez_sak",
    result: "Знайде Instagram `bez_sakhara`.",
  },
] as const;

export default function InfoPage() {
  return (
    <div className="page-container py-6">
      <div className="flex flex-col gap-6 max-w-4xl">
        <section className="flex flex-col gap-2">
          <h1 className="text-heading-1">Інфо</h1>
          <p className="text-body-base text-muted-foreground max-w-2xl">
            Швидка шпаргалка для check-in, пошуку та типових фестивальних ситуацій.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Як працює реєстрація</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ol className="flex flex-col gap-3">
              {CHECKIN_STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-semibold">
                    {index + 1}
                  </span>
                  <p className="text-body-base text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>

            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-body-base">
                Якщо QR-коду немає, знайдіть гостя через пошук за ім'ям, телефоном або email.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статуси</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {STATUS_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-lg border border-border/60 px-4 py-3"
              >
                <span
                  className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", item.tone)}
                />
                <div className="flex flex-col gap-1">
                  <p className="text-body-medium">{item.label}</p>
                  <p className="text-body-base text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Що робити якщо...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.question}
                className="rounded-lg border border-border/60 px-4 py-3"
              >
                <p className="text-body-medium">{item.question}</p>
                <p className="mt-1 text-body-base text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Як працює пошук</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              {SEARCH_RULES.map((rule) => (
                <p key={rule} className="text-body-base text-muted-foreground">
                  {rule}
                </p>
              ))}
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Запит</TableHead>
                    <TableHead>Що буде знайдено</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SEARCH_EXAMPLES.map((example) => (
                    <TableRow key={example.query}>
                      <TableCell className="font-mono text-[13px]">
                        {example.query}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {example.result}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
