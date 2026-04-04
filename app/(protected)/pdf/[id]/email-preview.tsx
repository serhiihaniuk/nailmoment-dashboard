"use client";

import { useState, useTransition } from "react";
import { previewCustomEmail, sendCustomEmail } from "@/app/_actions/get-email";

type Tab = "html" | "text" | "compose";

export function EmailPreview({
  html,
  text,
  ticketId,
}: {
  html: string;
  text: string;
  ticketId: string;
}) {
  const [tab, setTab] = useState<Tab>("html");
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<
    "idle" | "success" | "error"
  >("idle");

  async function handleResend() {
    setResending(true);
    setResendResult("idle");
    try {
      const r = await fetch(`/api/ticket/${ticketId}`, { method: "POST" });
      setResendResult(r.ok ? "success" : "error");
    } catch {
      setResendResult("error");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1">
          {(["html", "text", "compose"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t === "html" ? "HTML" : t === "text" ? "Plain Text" : "Compose"}
            </button>
          ))}
        </div>

        <div className="mx-2 h-5 w-px bg-gray-300" />

        <button
          onClick={handleResend}
          disabled={resending}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            resendResult === "success"
              ? "bg-green-600 text-white"
              : resendResult === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
          } disabled:opacity-50`}
        >
          {resending
            ? "Sending..."
            : resendResult === "success"
              ? "Sent!"
              : resendResult === "error"
                ? "Failed"
                : "Resend Ticket Email"}
        </button>
      </div>

      {/* Content */}
      {tab === "html" && (
        <iframe
          srcDoc={html}
          className="min-h-screen w-full border-0 bg-gray-100"
          sandbox=""
        />
      )}
      {tab === "text" && (
        <pre className="mx-auto max-w-150 whitespace-pre-wrap bg-white p-8 font-mono text-sm leading-relaxed text-gray-800 shadow-sm">
          {text}
        </pre>
      )}
      {tab === "compose" && <ComposeTab ticketId={ticketId} />}
    </div>
  );
}

function ComposeTab({ ticketId }: { ticketId: string }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function handlePreview() {
    startPreview(async () => {
      const html = await previewCustomEmail("{{name}}", subject, body);
      setPreviewHtml(html);
    });
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    if (!confirm("Send this email to the ticket holder?")) return;

    setSending(true);
    setSendResult(null);
    try {
      const result = await sendCustomEmail(ticketId, subject, body);
      if (result.success) {
        setSendResult({ type: "success", message: "Email sent successfully!" });
      } else {
        setSendResult({
          type: "error",
          message: result.error || "Failed to send",
        });
      }
    } catch {
      setSendResult({ type: "error", message: "Failed to send" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-250 gap-6 p-6">
      {/* Editor */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Тема листа..."
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
          />
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Текст листа...&#10;&#10;Кожен абзац буде окремим блоком тексту.&#10;Порожні рядки розділяють абзаци."
            className="min-h-64 w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            disabled={isPreviewing || (!subject.trim() && !body.trim())}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50"
          >
            {isPreviewing ? "Loading..." : "Preview"}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              sendResult?.type === "success"
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {sending
              ? "Sending..."
              : sendResult?.type === "success"
                ? "Sent!"
                : "Send"}
          </button>
          {sendResult?.type === "error" && (
            <span className="text-sm text-red-600">{sendResult.message}</span>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="hidden flex-1 flex-col lg:flex">
        <span className="mb-1 text-xs font-medium text-gray-500">
          Preview
        </span>
        {previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            className="flex-1 rounded-lg border border-gray-200 bg-white"
            sandbox=""
          />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
            Click &quot;Preview&quot; to see the email
          </div>
        )}
      </div>
    </div>
  );
}
