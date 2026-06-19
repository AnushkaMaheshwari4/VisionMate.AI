import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Mic, Plus, Search, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/voice/")({
  head: () => ({ meta: [{ title: "Voice Assistant — VisionMate AI" }] }),
  component: VoiceIndex,
});

type Conv = { id: string; title: string; language: string; updated_at: string };

function VoiceIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("voice_conversations")
      .select("id,title,language,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setConvs((data ?? []) as Conv[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function newChat() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("voice_conversations")
        .insert({ user_id: user.id, title: "New conversation" } as never)
        .select("id")
        .single();
      if (error) throw error;
      navigate({ to: "/voice/$id", params: { id: (data as { id: string }).id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start chat");
    } finally {
      setLoading(false);
    }
  }

  const filtered = convs.filter((c) => !search.trim() || c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Mic className="h-7 w-7 text-primary" aria-hidden /> Voice Assistant</h1>
          <p className="text-muted-foreground mt-1">Chat by voice or text. Supports English and Hindi.</p>
        </div>
        <Button onClick={newChat} disabled={loading} size="lg">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
          New chat
        </Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" className="pl-9 h-10" aria-label="Search conversations" />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Mic className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden />
          <p className="font-medium">No conversations yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start your first chat to talk with VisionMate.</p>
          <Button onClick={newChat} className="mt-6" size="lg">Start chatting</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <ConversationRow key={c.id} c={c} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationRow({ c, onChanged }: { c: Conv; onChanged: () => void }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);

  async function rename() {
    setEditing(false);
    if (title.trim() === c.title) return;
    const { error } = await supabase.from("voice_conversations").update({ title: title.trim() } as never).eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Renamed"); onChanged(); }
  }
  async function remove() {
    if (!confirm("Delete this conversation?")) return;
    const { error } = await supabase.from("voice_conversations").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChanged(); }
  }

  return (
    <Card className="p-4 flex items-center justify-between gap-3 hover:border-primary transition">
      <button onClick={() => navigate({ to: "/voice/$id", params: { id: c.id } })} className="flex-1 text-left min-w-0">
        {editing ? (
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === "Enter" && rename()} onClick={(e) => e.stopPropagation()} className="h-9" />
        ) : (
          <p className="font-medium truncate">{c.title}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}</p>
      </button>
      <Button variant="ghost" size="sm" onClick={() => { setTitle(c.title); setEditing(true); }} aria-label="Rename">Rename</Button>
      <Button variant="ghost" size="sm" onClick={remove} aria-label="Delete conversation" className="text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </Card>
  );
}

