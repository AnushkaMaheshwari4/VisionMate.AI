import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useServerFn } from "@tanstack/react-start";
import { sendVoiceMessage } from "@/lib/voice.functions";
import { toast } from "sonner";
import { createRecognizer, speak, stopSpeaking, type SpeechRecognitionLike } from "@/lib/speech";
import { Loader2, Mic, MicOff, Send, Volume2 } from "lucide-react";
import { notifyVoiceListChanged } from "./voice";

export const Route = createFileRoute("/_authenticated/voice/$id")({
  head: () => ({ meta: [{ title: "Conversation — VisionMate AI" }] }),
  component: VoiceChat,
});


type Msg = { id: string; role: "user" | "assistant" | "system"; content: string; created_at: string };

function VoiceChat() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { settings } = useSettings();
  const send = useServerFn(sendVoiceMessage);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [title, setTitle] = useState("Conversation");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: conv } = await supabase.from("voice_conversations").select("title").eq("id", id).maybeSingle();
      if (conv) setTitle((conv as { title: string }).title);
      const { data } = await supabase.from("voice_messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
      setMsgs((data ?? []) as Msg[]);
      inputRef.current?.focus();
    })();
  }, [id, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, sending]);

  async function handleSend(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    const tempUserMsg: Msg = { id: `tmp-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, tempUserMsg]);
    setInput("");
    try {
      const result = await send({ data: { conversationId: id, message: text, language: settings.voice_language } });
      const reply = (result as { reply: string }).reply;
      setMsgs((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: reply, created_at: new Date().toISOString() }]);
      if (settings.auto_speak) speak(reply, { lang: settings.voice_language, rate: settings.speech_rate });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Message failed");
      setMsgs((m) => m.filter((x) => x.id !== tempUserMsg.id));
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const r = createRecognizer(settings.voice_language);
    if (!r) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    r.onresult = (e) => {
      const txt = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      setInput(txt);
      handleSend(txt);
    };
    r.onerror = (e) => { toast.error(`Mic error: ${e.error}`); setListening(false); };
    r.onend = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  }

  function readAloud(text: string) {
    speak(text, { lang: settings.voice_language, rate: settings.speech_rate });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/voice" })} aria-label="Back to conversations">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Button>
        <h1 className="font-semibold truncate flex-1">{title}</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">{settings.voice_language === "hi" ? "हिन्दी" : "English"}</span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {msgs.length === 0 && !sending && (
            <Card className="p-6 text-center bg-accent/30">
              <Mic className="h-10 w-10 mx-auto text-primary mb-3" aria-hidden />
              <p className="font-medium">Try asking:</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  "Summarize my recent images",
                  "What's the weather like?",
                  "Describe my last analyzed photo",
                  "Help me write a quick message",
                ].map((s) => (
                  <button key={s} onClick={() => handleSend(s)} className="text-sm rounded-lg border border-border p-3 hover:bg-accent text-left">
                    {s}
                  </button>
                ))}
              </div>
            </Card>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {m.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl bg-primary text-primary-foreground px-4 py-3 shadow">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              ) : (
                <div className="max-w-[85%] group">
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">{m.content}</p>
                  <button onClick={() => readAloud(m.content)} aria-label="Read aloud" className="mt-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition inline-flex items-center gap-1">
                    <Volume2 className="h-3 w-3" aria-hidden /> Listen
                  </button>
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Thinking…
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-4 bg-background">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="max-w-3xl mx-auto flex items-center gap-2">
          <Button type="button" variant={listening ? "destructive" : "outline"} size="icon" onClick={toggleMic} aria-label={listening ? "Stop listening" : "Start voice input"} className="h-11 w-11 shrink-0">
            {listening ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening…" : "Type or speak a message…"}
            className="h-11"
            disabled={sending}
            aria-label="Message"
          />
          <Button type="submit" disabled={sending || !input.trim()} size="icon" className="h-11 w-11 shrink-0" aria-label="Send message">
            <Send className="h-5 w-5" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}
