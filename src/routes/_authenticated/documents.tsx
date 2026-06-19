import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useServerFn } from "@tanstack/react-start";
import { analyzeDocument, deleteDocument } from "@/lib/document.functions";
import { toast } from "sonner";
import { speak, stopSpeaking } from "@/lib/speech";
import { FileText, Loader2, Search, Trash2, Upload, Volume2, VolumeX } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — VisionMate AI" }] }),
  component: DocumentsPage,
});

type Doc = {
  id: string;
  title: string;
  extracted_text: string | null;
  summary: string | null;
  key_points: string[] | null;
  source_url: string | null;
  source_path: string | null;
  created_at: string;
};

function DocumentsPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const analyze = useServerFn(analyzeDocument);
  const del = useServerFn(deleteDocument);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState<Doc | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Doc | null>(null);
  const [speaking, setSpeaking] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image of the document (PDF support coming soon)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/docs/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("visionmate-uploads").upload(path, file, {
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("visionmate-uploads").createSignedUrl(path, 60 * 60 * 24 * 30);
      if (!signed?.signedUrl) throw new Error("Could not get document URL");
      toast.info("Reading your document…");
      const result = await analyze({
        data: { imageUrl: signed.signedUrl, imagePath: path, title: file.name, mimeType: file.type },
      });
      setCurrent(result as unknown as Doc);
      await load();
      toast.success("Document ready");
      if (settings.auto_speak) {
        speak((result as Doc).summary ?? "Document ready", { lang: settings.voice_language, rate: settings.speech_rate });
        setSpeaking(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read document");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del({ data: { id: toDelete.id } });
      if (toDelete.source_path) await supabase.storage.from("visionmate-uploads").remove([toDelete.source_path]);
      if (current?.id === toDelete.id) setCurrent(null);
      setDocs((d) => d.filter((x) => x.id !== toDelete.id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setToDelete(null);
    }
  }

  function toggleSpeak(text: string) {
    if (speaking) { stopSpeaking(); setSpeaking(false); }
    else { speak(text, { lang: settings.voice_language, rate: settings.speech_rate }); setSpeaking(true); }
  }

  const filtered = docs.filter((d) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return d.title.toLowerCase().includes(s) || d.summary?.toLowerCase().includes(s) || d.extracted_text?.toLowerCase().includes(s);
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" aria-hidden /> Smart Document Reader
        </h1>
        <p className="text-muted-foreground mt-1">Snap a photo of any document. We'll read it and summarize it for you.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" aria-hidden />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border p-10 text-center hover:border-primary hover:bg-accent/30 transition"
              aria-label="Upload a document image"
            >
              {uploading ? (
                <div className="space-y-3"><Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden /><p className="font-medium">Reading…</p></div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground"><Upload className="h-7 w-7" aria-hidden /></div>
                  <p className="font-semibold text-lg">Upload a document image</p>
                  <p className="text-sm text-muted-foreground">JPG, PNG, or WebP. Up to 10MB.</p>
                </div>
              )}
            </div>
          </Card>

          {current && (
            <Card className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold">{current.title}</h2>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(current.created_at), { addSuffix: true })}</p>
              </div>
              <Button variant="secondary" onClick={() => toggleSpeak(`${current.summary}. Key points: ${(current.key_points ?? []).join(". ")}`)}>
                {speaking ? <><VolumeX className="mr-2 h-4 w-4" aria-hidden /> Stop reading</> : <><Volume2 className="mr-2 h-4 w-4" aria-hidden /> Read summary aloud</>}
              </Button>
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-sm">{current.summary}</p>
              </div>
              {!!current.key_points?.length && (
                <div>
                  <h3 className="font-semibold mb-2">Key points</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {current.key_points.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2">Extracted text</h3>
                <p className="whitespace-pre-wrap text-sm bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">{current.extracted_text}</p>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" className="pl-9 h-10" aria-label="Search documents" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">{filtered.length} {filtered.length === 1 ? "document" : "documents"}</p>
          </Card>
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No documents yet.</p>
            ) : (
              filtered.map((d) => (
                <Card key={d.id} className={`p-3 cursor-pointer hover:border-primary transition ${current?.id === d.id ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => { setCurrent(d); stopSpeaking(); setSpeaking(false); }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate">{d.title}</p>
                    <button onClick={(e) => { e.stopPropagation(); setToDelete(d); }} aria-label={`Delete ${d.title}`} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{d.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</p>
                </Card>
              ))
            )}
          </div>
        </aside>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the document and its extracted text.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
