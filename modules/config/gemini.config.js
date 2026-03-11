// Gemini API caller and JSON parser.
// All AI calls in the app flow through callGemini() here.

import { fb } from "../state.js";
import { GEMINI_MODELS } from "../assets/constants.js";
import { storeSet } from "../services/db.service.js";

export function getKey() { return fb.apiKey; }

export function parseJSON(text) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(cleaned); } catch (e) {}
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON found in response");
  try { return JSON.parse(cleaned.substring(start, end + 1)); }
  catch (e) { throw new Error("Invalid JSON in response"); }
}

export async function callGemini(prompt, system = "") {
  const key = getKey();
  if (!key) throw new Error("No API key. Go to Settings to add one.");

  const body = {
    contents:         [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const modelsToTry = fb.workingModel
    ? [fb.workingModel, ...GEMINI_MODELS.filter(m => m !== fb.workingModel)]
    : GEMINI_MODELS;

  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || "";
        if (msg.includes("not found") || msg.includes("not supported") || res.status === 404) {
          lastErr = new Error(msg); continue;
        }
        throw new Error(msg || "API returned " + res.status);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "API error");
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!txt) throw new Error("Empty response from API");
      if (model !== fb.workingModel) { fb.workingModel = model; storeSet("jt_gemini_model", model); }
      return txt;
    } catch (e) {
      if (e.message && (e.message.includes("not found") || e.message.includes("not supported"))) {
        lastErr = e; continue;
      }
      if (e.message === "Failed to fetch")
        throw new Error("Network blocked \u2014 download this file and open it locally. The preview sandbox blocks external API calls.");
      throw e;
    }
  }
  throw lastErr || new Error("No compatible Gemini model found. Please check your API key.");
}
