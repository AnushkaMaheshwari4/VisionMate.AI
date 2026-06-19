import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  imageUrl: z.string().url(),
  imagePath: z.string().optional(),
  title: z.string().min(1).max(120),
  mimeType: z.string().optional(),
});

const SYSTEM = `You are an assistive OCR & document analyst for blind users.
Given an image of a document (page, sign, label, letter, receipt, etc.) return STRICT JSON:
{
  "extracted_text": string,   // verbatim text content, preserve order
  "summary": string,          // 2-4 sentence plain-language summary
  "key_points": string[]      // 3-8 bullet points of the most important facts
}
Do not include markdown fences.`;

export const analyzeDocument = createServerFn({ method: "POST" })
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
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Read and summarize this document image." },
            { type: "image", image: new URL(data.imageUrl) },
          ],
        },
      ],
    });

    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }
    let parsed: { extracted_text?: string; summary?: string; key_points?: string[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { extracted_text: cleaned, summary: cleaned.slice(0, 300), key_points: [] };
    }

    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        title: data.title,
        source_url: data.imageUrl,
        source_path: data.imagePath ?? null,
        mime_type: data.mimeType ?? "image",
        extracted_text: parsed.extracted_text ?? "",
        summary: parsed.summary ?? "",
        key_points: parsed.key_points ?? [],
      } as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as {
      id: string;
      title: string;
      extracted_text: string;
      summary: string;
      key_points: string[];
      source_url: string;
      created_at: string;
    };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
