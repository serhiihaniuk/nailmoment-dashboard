"use client";

import { useState } from "react";

interface Props {
  tickets: { type: string; html: string; text: string }[];
  battleHtml: string;
  battleText: string;
}

type ViewMode = "html" | "text";

export function EmailDemoPage({ tickets, battleHtml, battleText }: Props) {
  const tabs = [
    ...tickets.map((t) => ({
      label: t.type.toUpperCase(),
      html: t.html,
      text: t.text,
    })),
    { label: "BATTLE", html: battleHtml, text: battleText },
  ];

  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("html");

  const current = tabs[activeTab];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-white px-4 py-2 shadow-sm">
        {/* Email type tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === i
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mx-2 h-5 w-px bg-gray-300" />

        {/* View mode toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode("html")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "html"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            HTML
          </button>
          <button
            onClick={() => setViewMode("text")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "text"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Plain Text
          </button>
        </div>
      </div>

      {viewMode === "html" ? (
        <iframe
          key={`${activeTab}-html`}
          srcDoc={current.html}
          className="min-h-screen w-full border-0 bg-gray-100"
          sandbox=""
        />
      ) : (
        <pre className="mx-auto max-w-150 whitespace-pre-wrap bg-white p-8 font-mono text-sm leading-relaxed text-gray-800 shadow-sm">
          {current.text}
        </pre>
      )}
    </div>
  );
}
