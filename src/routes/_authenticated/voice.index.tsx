import { createFileRoute } from "@tanstack/react-router";
import { Mic, MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/voice/")({
  head: () => ({ meta: [{ title: "Voice Assistant — VisionMate AI" }] }),
  component: VoiceWelcome,
});

function VoiceWelcome() {
  return (
    <div className="h-full flex items-center justify-center px-6 py-12 text-center">
      <div className="max-w-md">
        <div className="mx-auto h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground mb-5">
          <Mic className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-3xl font-bold">Voice Assistant</h1>
        <p className="mt-2 text-muted-foreground">
          Chat by voice or text in English or Hindi. Pick a conversation from the sidebar — or start a new one.
        </p>
        <div className="mt-6 grid gap-3 text-left">
          <div className="rounded-xl border border-border p-4 flex gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <p className="text-sm">Ask about your recent image analyses, get summaries, or just chat.</p>
          </div>
          <div className="rounded-xl border border-border p-4 flex gap-3">
            <MessageSquare className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <p className="text-sm">Every conversation is saved and searchable from the sidebar.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
