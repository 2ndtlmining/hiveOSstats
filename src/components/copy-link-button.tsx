"use client";

import { useState } from "react";
import { Check, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copies the current page URL (which holds the view's state) to the clipboard. */
export function CopyLinkButton() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    const url = window.location.href;
    let ok = false;
    try {
      // The Clipboard API needs a secure context (https or localhost), which a
      // LAN address over plain http isn't
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      ok = legacyCopy(url);
    }
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 2500);
  }

  const Icon = state === "copied" ? Check : state === "failed" ? X : Link2;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      aria-live="polite"
      title={state === "failed" ? "Copy the address bar instead: this page's URL holds the current view" : undefined}
    >
      <Icon className="mr-2 h-4 w-4" />
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy link"}
    </Button>
  );
}

/** Fallback for insecure contexts: copy via a temporary, off-screen textarea. */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
