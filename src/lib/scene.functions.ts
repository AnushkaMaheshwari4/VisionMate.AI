import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  imageUrl: z.string().url(),
  imagePath: z.string().optional(),
});

const SYSTEM_PROMPT = `You are VisionMate AI, a vision assistant for blind and low-vision users.
You will be shown a photograph. Describe what you see in clear, warm, useful language.
Return STRICT JSON with this shape (no markdown fences, no commentary):
{
  "title": string,                   // 3-7 word title
  "short_description": string,       // 1-2 sentences, what is this scene?
  "detailed_description": string,    // 3-6 sentences, paint the full scene; describe positions and surroundings
  "detected_objects": string[],      // 3-12 notable objects with brief modifiers
  "detected_people": string[],       // people if any, with approximate count, posture, clothing color cues; [] if none
  "detected_text": string,           // any visible text read verbatim; "" if none
  "hazards": string[],               // potential obstacles or hazards a blind user should know about; [] if none
  "simple_summary": string           // one short, friendly sentence for voice playback
}`;

export const analyzeScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image for a visually impaired user." },
            { type: "image", image: new URL(data.imageUrl) },
          ],
        },
      ],
    });

    // Parse JSON (model may wrap in code fence)
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }
    let parsed: {
      title?: string;
      short_description?: string;
      detailed_description?: string;
      detected_objects?: string[];
      detected_people?: string[];
      detected_text?: string;
      hazards?: string[];
      simple_summary?: string;
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        title: "Scene",
        short_description: cleaned.slice(0, 200),
        detailed_description: cleaned,
        simple_summary: cleaned.slice(0, 160),
      };
    }

    const { data: row, error } = await context.supabase
      .from("image_analyses")
      .insert({
        user_id: context.userId,
        image_url: data.imageUrl,
        image_path: data.imagePath ?? null,
        title: parsed.title ?? "Scene",
        short_description: parsed.short_description ?? null,
        detailed_description: parsed.detailed_description ?? null,
        detected_objects: parsed.detected_objects ?? [],
        detected_people: parsed.detected_people ?? [],
        detected_text: parsed.detected_text ?? null,
        hazards: parsed.hazards ?? [],
        simple_summary: parsed.simple_summary ?? null,
        model: "google/gemini-3-flash-preview",
      } as never)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row as unknown as {
      id: string;
      title: string;
      short_description: string;
      detailed_description: string;
      detected_objects: string[];
      detected_people: string[];
      detected_text: string | null;
      hazards: string[];
      simple_summary: string;
      image_url: string;
      created_at: string;
    };
  });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("image_analyses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
