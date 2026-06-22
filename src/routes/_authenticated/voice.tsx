import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, MessageSquare, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/voice")({
  component: VoiceLayout,
});

type Conv = { id: string; title: string; language: string; updated_at: string };

type CtxValue = {
  reload: () => Promise<void>;
  setTitleLocal: (id: string, title: string) => void;
};

// Simple event bus so child route can request refresh after sending a message.
const listeners = new Set<() => void>();
export function notifyVoiceListChanged() {
  listeners.forEach((fn) => fn());
}

function VoiceLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [convs, setConvs] = useState<Conv[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [toDelete, setToDelete] = useState<Conv | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("voice_conversations")
      .select("id,title,language,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setConvs((data ?? []) as Conv[]);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);

  async function newChat() {
    if (!user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("voice_conversations")
        .insert({ user_id: user.id, title: "New conversation" } as never)
        .select("id")
        .single();
      if (error) throw error;
      await load();
      navigate({ to: "/voice/$id", params: { id: (data as { id: string }).id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start chat");
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(id: string) {
    const title = editTitle.trim();
    setEditingId(null);
    if (!title) return;
    const { error } = await supabase
      .from("voice_conversations")
      .update({ title } as never)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)));
      toast.success("Renamed");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    const { error } = await supabase.from("voice_conversations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setConvs((cs) => cs.filter((c) => c.id !== id));
    toast.success("Deleted");
    if (currentPath.includes(id)) navigate({ to: "/voice" });
  }

  const filtered = convs.filter(
    (c) => !search.trim() || c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const activeId = currentPath.startsWith("/voice/") ? currentPath.split("/voice/")[1]?.split("/")[0] : undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <aside className="w-72 border-r border-border bg-card/40 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button onClick={newChat} disabled={creating} className="w-full h-10" aria-label="Start new conversation">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
            New chat
          </Button>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 h-9"
              aria-label="Search conversations"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 px-3">
              {convs.length === 0 ? "No conversations yet. Start one above." : "No matches."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <div
                    className={`group rounded-lg flex items-center gap-1 pr-1 transition ${
                      activeId === c.id ? "bg-accent" : "hover:bg-accent/60"
                    }`}
                  >
                    {editingId === c.id ? (
                      <Input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveRename(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(c.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-8 mx-1 my-1"
                        aria-label="Conversation title"
                      />
                    ) : (
                      <Link
                        to="/voice/$id"
                        params={{ id: c.id }}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg"
                      >
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                        </p>
                      </Link>
                    )}
                    {editingId !== c.id && (
                      <div className="flex shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                        <button
                          onClick={() => {
                            setEditTitle(c.title);
                            setEditingId(c.id);
                          }}
                          aria-label={`Rename ${c.title}`}
                          className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          onClick={() => setToDelete(c)}
                          aria-label={`Delete ${c.title}`}
                          className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-3 border-t border-border text-[11px] text-muted-foreground flex items-center gap-1">
          <MessageSquare className="h-3 w-3" aria-hidden />
          {convs.length} {convs.length === 1 ? "conversation" : "conversations"}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <Outlet />
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the conversation and its messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export type { CtxValue };
