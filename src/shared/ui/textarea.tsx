"use client"

import * as React from "react"

import { cn } from "@/shared/lib/cn"

type TextareaProps = React.ComponentProps<"textarea"> & {
  maxRows?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      defaultValue,
      maxRows = 5,
      onInput,
      rows = 2,
      value,
      ...props
    },
    forwardedRef
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

    const setTextareaRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node

        if (typeof forwardedRef === "function") {
          forwardedRef(node)
          return
        }

        if (forwardedRef) {
          forwardedRef.current = node
        }
      },
      [forwardedRef]
    )

    React.useLayoutEffect(() => {
      if (!textareaRef.current) return
      resizeTextarea(textareaRef.current, maxRows)
    }, [defaultValue, maxRows, value])

    return (
      <textarea
        ref={setTextareaRef}
        data-slot="textarea"
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        onInput={(event) => {
          resizeTextarea(event.currentTarget, maxRows)
          onInput?.(event)
        }}
        className={cn(
          "flex field-sizing-content min-h-16 w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

function resizeTextarea(textarea: HTMLTextAreaElement, maxRows: number) {
  textarea.style.height = "auto"

  const style = window.getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(style.lineHeight) || 20
  const paddingY =
    Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
  const borderY =
    Number.parseFloat(style.borderTopWidth) +
    Number.parseFloat(style.borderBottomWidth)
  const maxHeight = lineHeight * maxRows + paddingY + borderY
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight)

  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY =
    textarea.scrollHeight > maxHeight ? "auto" : "hidden"
}

export { Textarea }
