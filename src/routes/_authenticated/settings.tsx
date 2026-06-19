import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { Sun, Moon, Monitor, Type, Eye, Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — VisionMate AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update } = useSettings();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Personalize VisionMate to fit how you use it.</p>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Sun className="h-5 w-5" aria-hidden /> Appearance</h2>
          <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
            {([
              { v: "light", label: "Light", Icon: Sun },
              { v: "dark", label: "Dark", Icon: Moon },
              { v: "system", label: "System", Icon: Monitor },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v}
                role="radio"
                aria-checked={settings.theme === v}
                onClick={() => update({ theme: v })}
                className={`rounded-xl border-2 p-4 text-center transition ${settings.theme === v ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <Icon className="h-5 w-5 mx-auto mb-2" aria-hidden />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <Label className="text-base flex items-center gap-2"><Eye className="h-4 w-4" aria-hidden /> High contrast mode</Label>
              <p className="text-xs text-muted-foreground mt-1">Bold borders, pure black/white for maximum visibility.</p>
            </div>
            <Switch checked={settings.high_contrast} onCheckedChange={(c) => update({ high_contrast: c })} aria-label="Toggle high contrast" />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Type className="h-5 w-5" aria-hidden /> Font size</h2>
          <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="Font size">
            {(["sm", "base", "lg", "xl"] as const).map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={settings.font_size === s}
                onClick={() => update({ font_size: s })}
                className={`rounded-xl border-2 p-4 transition ${settings.font_size === s ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <span className={`block font-medium ${s === "sm" ? "text-sm" : s === "base" ? "text-base" : s === "lg" ? "text-lg" : "text-xl"}`}>Aa</span>
                <span className="text-xs text-muted-foreground mt-1 capitalize">{s === "base" ? "Default" : s === "xl" ? "Extra large" : s === "lg" ? "Large" : "Small"}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2"><Volume2 className="h-5 w-5" aria-hidden /> Voice & speech</h2>

          <div>
            <Label className="text-base">Language</Label>
            <div className="grid grid-cols-2 gap-3 mt-2" role="radiogroup" aria-label="Voice language">
              {([{ v: "en", label: "English" }, { v: "hi", label: "हिन्दी (Hindi)" }] as const).map(({ v, label }) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={settings.voice_language === v}
                  onClick={() => update({ voice_language: v })}
                  className={`rounded-xl border-2 p-4 text-center transition ${settings.voice_language === v ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base">Speech rate</Label>
              <span className="text-sm text-muted-foreground">{settings.speech_rate.toFixed(1)}×</span>
            </div>
            <Slider min={0.5} max={2} step={0.1} value={[settings.speech_rate]} onValueChange={([v]) => update({ speech_rate: v })} aria-label="Speech rate" />
            <Button variant="outline" size="sm" className="mt-3" onClick={() => speak("This is how VisionMate sounds at the current rate.", { lang: settings.voice_language, rate: settings.speech_rate })}>
              <Volume2 className="h-4 w-4 mr-2" aria-hidden /> Preview voice
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Auto-read AI responses</Label>
              <p className="text-xs text-muted-foreground mt-1">Read scene descriptions and assistant replies aloud automatically.</p>
            </div>
            <Switch checked={settings.auto_speak} onCheckedChange={(c) => update({ auto_speak: c })} aria-label="Auto-read responses" />
          </div>
        </Card>
      </div>
    </div>
  );
}
