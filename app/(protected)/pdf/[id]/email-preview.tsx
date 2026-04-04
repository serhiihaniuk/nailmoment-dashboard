"use client";

import { useState } from "react";

export function EmailPreview({ html, text }: { html: string; text: string }) {
  const [view, setView] = useState<"html" | "text">("html");

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
        <span className="mr-2 text-sm font-medium text-gray-500">
          Preview:
        </span>
        <button
          onClick={() => setView("html")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "html"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          HTML
        </button>
        <button
          onClick={() => setView("text")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "text"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Plain Text
        </button>
      </div>

      {view === "html" ? (
        <iframe
          srcDoc={html}
          className="min-h-screen w-full border-0 bg-gray-100"
          sandbox=""
        />
      ) : (
        <pre className="mx-auto max-w-150 whitespace-pre-wrap bg-white p-8 font-mono text-sm leading-relaxed text-gray-800 shadow-sm">
          {text}
        </pre>
      )}
    </div>
  );
}
