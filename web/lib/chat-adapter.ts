"use client";

import type { ChatModelAdapter } from "@assistant-ui/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

export const fastapiAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const token = typeof window !== "undefined" ? localStorage.getItem("weft_access_token") : null;
    const response = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content
            .filter((c): c is typeof c & { type: "text"; text: string } => c.type === "text")
            .map((c) => ({ type: "text", text: c.text })),
        })),
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      accumulated += chunk;
      yield { content: [{ type: "text", text: accumulated }] };
    }
  },
};
