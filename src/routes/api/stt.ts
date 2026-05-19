import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth check
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        if (!token) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !userData?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const formData = await request.formData();
        const file = formData.get("file") as Blob | null;
        if (!file) {
          return new Response(JSON.stringify({ error: "audio file missing" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const apiForm = new FormData();
        apiForm.append("file", file, "audio.webm");
        apiForm.append("model_id", "scribe_v2");
        apiForm.append("language_code", "deu");
        apiForm.append("tag_audio_events", "false");
        apiForm.append("diarize", "false");

        const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": apiKey },
          body: apiForm,
        });

        if (!res.ok) {
          const errTxt = await res.text();
          return new Response(JSON.stringify({ error: "transcription_failed", details: errTxt }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = await res.json();
        return new Response(JSON.stringify({ text: data.text ?? "" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
