import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

type Theme = "light" | "dark" | "system";
type FontSize = "sm" | "base" | "lg" | "xl";

export type Settings = {
  theme: Theme;
  font_size: FontSize;
  high_contrast: boolean;
  voice_language: "en" | "hi";
  speech_rate: number;
  auto_speak: boolean;
};

const DEFAULTS: Settings = {
  theme: "system",
  font_size: "base",
  high_contrast: false,
  voice_language: "en",
  speech_rate: 1,
  auto_speak: true,
};

const Ctx = createContext<{
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
}>({ settings: DEFAULTS, update: async () => {} });

function applyToDom(s: Settings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Theme
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = s.theme === "dark" || (s.theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
  // High contrast
  root.classList.toggle("high-contrast", s.high_contrast);
  // Font size
  root.classList.remove("font-sm", "font-base", "font-lg", "font-xl");
  root.classList.add(`font-${s.font_size}`);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = localStorage.getItem("vm_settings");
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      // noop
    }
    return DEFAULTS;
  });

  // Apply settings to DOM
  useEffect(() => {
    applyToDom(settings);
    try {
      localStorage.setItem("vm_settings", JSON.stringify(settings));
    } catch {
      // noop
    }
  }, [settings]);

  // Pull from DB once user signs in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          theme: (data.theme as Theme) ?? "system",
          font_size: (data.font_size as FontSize) ?? "base",
          high_contrast: !!data.high_contrast,
          voice_language: (data.voice_language as "en" | "hi") ?? "en",
          speech_rate: Number(data.speech_rate ?? 1),
          auto_speak: !!data.auto_speak,
        });
      }
    })();
  }, [user]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        return next;
      });
      if (user) {
        await supabase
          .from("user_settings")
          .upsert({ user_id: user.id, ...patch } as never, { onConflict: "user_id" });
      }
    },
    [user],
  );

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
