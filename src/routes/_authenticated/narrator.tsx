import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useServerFn } from "@tanstack/react-start";
import { analyzeScene, deleteAnalysis } from "@/lib/scene.functions";
import { toast } from "sonner";
import { speak, stopSpeaking } from "@/lib/speech";
import { AlertTriangle, Eye, Loader2, Search, Trash2, Upload, Volume2, VolumeX, X } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/narrator")({
  head: () => ({ meta: [{ title: "Scene Narrator — VisionMate AI" }] }),
  component: NarratorPage,
});

type Analysis = {
  id: string;
  title: string | null;
  short_description: string | null;
  detailed_description: string | null;
  detected_objects: string[] | null;
  detected_people: string[] | null;
  detected_text: string | null;
  hazards: string[] | null;
  simple_summary: string | null;
  image_url: string;
  image_path: string | null;
  created_at: string;
};

function NarratorPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const analyze = useServerFn(analyzeScene);
  const del = useServerFn(deleteAnalysis);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Analysis | null>(null);
  const [speaking, setSpeaking] = useState(false);

  async function loadHistory() {
    if (!user) return;
    const { data } = await supabase
      .from("image_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []) as Analysis[]);
  }
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploading(true);
    setCurrent(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("visionmate-uploads").upload(path, file, {
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("visionmate-uploads").createSignedUrl(path, 60 * 60 * 24 * 30);
      if (!signed?.signedUrl) throw new Error("Could not get image URL");

      toast.info("Analyzing your image…");
      const result = await analyze({ data: { imageUrl: signed.signedUrl, imagePath: path } });
      setCurrent(result as unknown as Analysis);
      await loadHistory();
      toast.success("Scene analyzed");
      if (settings.auto_speak) {
        speak((result as Analysis).simple_summary ?? (result as Analysis).short_description ?? "Analysis ready", {
          lang: settings.voice_language,
          rate: settings.speech_rate,
        });
        setSpeaking(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del({ data: { id: toDelete.id } });
      if (toDelete.image_path) {
        await supabase.storage.from("visionmate-uploads").remove([toDelete.image_path]);
      }
      if (current?.id === toDelete.id) setCurrent(null);
      setHistory((h) => h.filter((x) => x.id !== toDelete.id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setToDelete(null);
    }
  }

  function toggleSpeak(text: string) {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(text, { lang: settings.voice_language, rate: settings.speech_rate });
      setSpeaking(true);
    }
  }

  const filtered = history.filter((h) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      h.title?.toLowerCase().includes(s) ||
      h.short_description?.toLowerCase().includes(s) ||
      h.detailed_description?.toLowerCase().includes(s) ||
      h.detected_text?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Eye className="h-7 w-7 text-primary" aria-hidden /> Scene Narrator
        </h1>
        <p className="text-muted-foreground mt-1">Upload any photo to hear what's in it.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main area */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" aria-hidden />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border p-10 text-center hover:border-primary hover:bg-accent/30 transition focus-visible:border-primary"
              aria-label="Upload an image to analyze"
            >
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden />
                  <p className="font-medium">Analyzing your image…</p>
                  <p className="text-sm text-muted-foreground">This usually takes a few seconds.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground">
                    <Upload className="h-7 w-7" aria-hidden />
                  </div>
                  <p className="font-semibold text-lg">Upload an image</p>
                  <p className="text-sm text-muted-foreground">JPG, PNG, or WebP. Up to 10MB.</p>
                </div>
              )}
            </div>
          </Card>

          {current && (
            <Card className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={current.image_url} alt={current.title ?? "Analyzed image"} className="w-full object-cover" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{current.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(current.created_at), { addSuffix: true })}
                  </p>
                  <p className="mt-3 text-base">{current.short_description}</p>
                  <Button
                    className="mt-4"
                    variant="secondary"
                    onClick={() => toggleSpeak(current.simple_summary ?? current.short_description ?? "")}
                    aria-label={speaking ? "Stop reading" : "Read aloud"}
                  >
                    {speaking ? <><VolumeX className="mr-2 h-4 w-4" aria-hidden /> Stop</> : <><Volume2 className="mr-2 h-4 w-4" aria-hidden /> Read aloud</>}
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <Section title="Full description">{current.detailed_description}</Section>
                {!!current.detected_objects?.length && (
                  <Section title="Detected objects">
                    <div className="flex flex-wrap gap-2">
                      {current.detected_objects.map((o, i) => (
                        <Badge key={i} variant="secondary">{o}</Badge>
                      ))}
                    </div>
                  </Section>
                )}
                {!!current.detected_people?.length && (
                  <Section title="People">
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {current.detected_people.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </Section>
                )}
                {current.detected_text && (
                  <Section title="Text visible in image">
                    <p className="whitespace-pre-wrap text-sm bg-muted rounded-lg p-3">{current.detected_text}</p>
                  </Section>
                )}
                {!!current.hazards?.length && (
                  <Section title="Hazards & cautions" tone="warning">
                    <ul className="space-y-1">
                      {current.hazards.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" aria-hidden /> {h}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* History */}
        <aside className="space-y-4">
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history…"
                className="pl-9 h-10"
                aria-label="Search analysis history"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">{filtered.length} {filtered.length === 1 ? "analysis" : "analyses"}</p>
          </Card>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No analyses yet.</p>
            ) : (
              filtered.map((h) => (
                <Card
                  key={h.id}
                  className={`p-3 cursor-pointer hover:border-primary transition ${current?.id === h.id ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => { setCurrent(h); stopSpeaking(); setSpeaking(false); }}
                >
                  <div className="flex gap-3">
                    <img src={h.image_url} alt="" className="h-16 w-16 rounded-md object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate">{h.title}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setToDelete(h); }}
                          aria-label={`Delete ${h.title}`}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{h.short_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </aside>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the image and its description.</AlertDialogDescription>
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

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "warning" }) {
  return (
    <div>
      <h3 className={`font-semibold mb-2 ${tone === "warning" ? "text-warning" : ""}`}>{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}
