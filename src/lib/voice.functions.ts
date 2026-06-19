import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const Input = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1),
  language: z.enum(["en", "hi"]).default("en"),
});

const SYS = (lang: string, ctx: string) => `You are VisionMate AI, a friendly conversational assistant for blind and low-vision users.
- Respond in ${lang === "hi" ? "Hindi (Devanagari script)" : "English"}.
- Be warm, concise, and descriptive. Use short paragraphs.
- The user may ask about images they've analyzed or documents they've uploaded. Use the context below when relevant.
- If a user asks for help with navigation or safety, prioritize clear actionable guidance.

USER CONTEXT (recent items):
${ctx || "(no recent activity)"}`;

export const sendVoiceMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    // Verify ownership
    const { data: conv, error: convErr } = await context.supabase
      .from("voice_conversations")
      .select("id, user_id, title")
      .eq("id", data.conversationId)
      .single();
    if (convErr || !conv) throw new Error("Conversation not found");

    // Load history
    const { data: history } = await context.supabase
      .from("voice_messages")
      .select("role, content")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(40);

    // Recent context: 3 latest image analyses
    const { data: recentImgs } = await context.supabase
      .from("image_analyses")
      .select("title, short_description, simple_summary, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(3);

    const ctxStr = (recentImgs ?? [])
      .map((r) => `- ${r.title ?? "Scene"}: ${r.simple_summary ?? r.short_description ?? ""}`)
      .join("\n");

    const prior = (history ?? []).map((m: { role: string; content: string }) => MessageSchema.parse(m));

    // Save user message
    await context.supabase.from("voice_messages").insert({
      conversation_id: data.conversationId,
      user_id: context.userId,
      role: "user",
      content: data.message,
    } as never);

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      messages: [
        { role: "system", content: SYS(data.language, ctxStr) },
        ...prior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: data.message },
      ],
    });

    // Save assistant reply
    const { data: saved, error: insErr } = await context.supabase
      .from("voice_messages")
      .insert({
        conversation_id: data.conversationId,
        user_id: context.userId,
        role: "assistant",
        content: text,
      } as never)
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    // Auto-title if still default
    if (conv.title === "New conversation") {
      const newTitle = data.message.slice(0, 60);
      await context.supabase
        .from("voice_conversations")
        .update({ title: newTitle } as never)
        .eq("id", data.conversationId);
    } else {
      await context.supabase
        .from("voice_conversations")
        .update({ updated_at: new Date().toISOString() } as never)
        .eq("id", data.conversationId);
    }

    return { reply: text, message: saved };
  });
