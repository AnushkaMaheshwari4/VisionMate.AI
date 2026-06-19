import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Phone, Plus, ShieldAlert, Trash2, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/emergency")({
  head: () => ({ meta: [{ title: "Emergency SOS — VisionMate AI" }] }),
  component: EmergencyPage,
});

type Contact = { id: string; name: string; phone: string; relationship: string | null; is_primary: boolean };
type Sos = { id: string; triggered_at: string; note: string | null; contacts_notified: { name: string; phone: string }[] | null };

function EmergencyPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Sos[]>([]);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [open, setOpen] = useState(false);
  const [sosDialog, setSosDialog] = useState(false);

  async function load() {
    if (!user) return;
    const [c, e] = await Promise.all([
      supabase.from("emergency_contacts").select("*").eq("user_id", user.id).order("is_primary", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("sos_events").select("*").eq("user_id", user.id).order("triggered_at", { ascending: false }).limit(20),
    ]);
    setContacts((c.data ?? []) as Contact[]);
    setEvents((e.data ?? []) as Sos[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function save(c: Partial<Contact>) {
    if (!user) return;
    const payload = { ...c, user_id: user.id } as never;
    let err;
    if (c.id) {
      const r = await supabase.from("emergency_contacts").update(payload).eq("id", c.id);
      err = r.error;
    } else {
      const r = await supabase.from("emergency_contacts").insert(payload);
      err = r.error;
    }
    if (err) toast.error(err.message);
    else { toast.success("Saved"); setOpen(false); setEditing(null); load(); }
  }
  async function remove(id: string) {
    if (!confirm("Remove this contact?")) return;
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  }

  async function triggerSos() {
    if (!user) return;
    if (contacts.length === 0) {
      toast.error("Add at least one emergency contact first.");
      return;
    }
    let location: { lat: number; lng: number } | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { /* optional */ }
    const notified = contacts.map((c) => ({ name: c.name, phone: c.phone }));
    const { error } = await supabase.from("sos_events").insert({
      user_id: user.id,
      note: "SOS triggered from app",
      contacts_notified: notified,
      location,
    } as never);
    if (error) toast.error(error.message);
    else { toast.success("SOS logged. Reach out to your contacts now."); setSosDialog(true); load(); }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="h-7 w-7 text-destructive" aria-hidden /> Emergency SOS</h1>
          <p className="text-muted-foreground mt-1">Keep trusted contacts one tap away.</p>
        </div>
        <Button onClick={triggerSos} variant="destructive" size="lg" className="h-14 px-8 text-lg font-bold animate-pulse" aria-label="Trigger SOS">
          <ShieldAlert className="mr-2 h-6 w-6" aria-hidden /> SOS
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Contacts</h2>
            <ContactDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }} editing={editing} onSave={save}>
              <Button onClick={() => { setEditing(null); setOpen(true); }} size="sm"><Plus className="h-4 w-4 mr-1" aria-hidden /> Add</Button>
            </ContactDialog>
          </div>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No contacts yet. Add your first one to get started.</p>
          ) : (
            <ul className="space-y-3">
              {contacts.map((c) => (
                <li key={c.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name} {c.is_primary && <span className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 ml-1">Primary</span>}</p>
                      {c.relationship && <p className="text-xs text-muted-foreground">{c.relationship}</p>}
                      <p className="text-sm mt-1">{c.phone}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setOpen(true); }} aria-label={`Edit ${c.name}`}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(c.id)} aria-label={`Delete ${c.name}`} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" aria-hidden /></Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1"><a href={`tel:${c.phone}`}><Phone className="h-4 w-4 mr-1" aria-hidden /> Call</a></Button>
                    <Button asChild size="sm" variant="outline" className="flex-1"><a href={`sms:${c.phone}?body=I%20need%20help.%20Sent%20via%20VisionMate%20AI.`}><MessageSquare className="h-4 w-4 mr-1" aria-hidden /> Text</a></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">SOS history</h2>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No SOS events yet.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> {formatDistanceToNow(new Date(e.triggered_at), { addSuffix: true })}</p>
                  {e.contacts_notified && e.contacts_notified.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Notified: {e.contacts_notified.map((c) => c.name).join(", ")}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={sosDialog} onOpenChange={setSosDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><ShieldAlert className="h-6 w-6" aria-hidden /> SOS triggered</DialogTitle>
            <DialogDescription>Reach out to your emergency contacts now. Event saved to your history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <div className="flex gap-1">
                  <Button asChild size="sm"><a href={`tel:${c.phone}`}><Phone className="h-4 w-4" aria-hidden /></a></Button>
                  <Button asChild size="sm" variant="outline"><a href={`sms:${c.phone}?body=I%20need%20help.`}><MessageSquare className="h-4 w-4" aria-hidden /></a></Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactDialog({
  children, open, onOpenChange, editing, onSave,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Contact | null;
  onSave: (c: Partial<Contact>) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rel, setRel] = useState("");
  const [primary, setPrimary] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name); setPhone(editing.phone); setRel(editing.relationship ?? ""); setPrimary(editing.is_primary);
    } else {
      setName(""); setPhone(""); setRel(""); setPrimary(false);
    }
  }, [editing, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit contact" : "Add emergency contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: editing?.id, name, phone, relationship: rel || null, is_primary: primary }); }} className="space-y-4">
          <div>
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="cphone">Phone</Label>
            <Input id="cphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+1 555 0123" className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="crel">Relationship (optional)</Label>
            <Input id="crel" value={rel} onChange={(e) => setRel(e.target.value)} placeholder="Mom, Doctor, Friend…" className="mt-1.5 h-11" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Mark as primary contact
          </label>
          <DialogFooter>
            <Button type="submit">{editing ? "Save" : "Add contact"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
