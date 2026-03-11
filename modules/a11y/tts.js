// Text-to-speech engine and voice input.
// Exposes ttsBtnHTML() for use by preview-engine.js to inject inline read-aloud buttons.

import { toast } from "../ui/utils.js";

let _utterance  = null;
let _speed      = 1;
let _speaking   = false;
const SPEEDS    = [0.75, 1, 1.25, 1.5];

// ── TTS button HTML (used by preview-engine) ─────────────────────────────────

export function ttsBtnHTML(text) {
  const safe = text.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
  return ` <button class="tts-btn" onclick="event.stopPropagation();ttsSpeak(this,'${safe.substring(0, 2000)}')" title="Read aloud" aria-label="Read this section aloud">&#128264;</button>`;
}

// ── Core TTS ─────────────────────────────────────────────────────────────────

export function ttsSpeak(btn, text) {
  if (!window.speechSynthesis) { toast("Text-to-speech not supported in this browser", "err"); return; }
  if (_speaking && btn?.classList.contains("speaking")) { ttsStop(); return; }
  ttsStop();
  const clean = text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
  if (!clean) return;

  _utterance      = new SpeechSynthesisUtterance(clean);
  _utterance.rate = _speed;
  _utterance.lang = "en-AU";
  _speaking       = true;

  document.querySelectorAll(".tts-btn.speaking").forEach(b => b.classList.remove("speaking"));
  if (btn) btn.classList.add("speaking");

  const player = document.getElementById("tts-player");
  if (player) player.classList.add("active");
  const label = document.getElementById("tts-player-label");
  if (label) label.textContent = "Reading...";
  const pauseBtn = document.getElementById("tts-pause-btn");
  if (pauseBtn) pauseBtn.textContent = "\u23F8";

  _utterance.onend   = () => _ttsCleanup(btn);
  _utterance.onerror = () => _ttsCleanup(btn);
  speechSynthesis.speak(_utterance);
}

export function ttsPause() {
  if (!speechSynthesis) return;
  const pauseBtn = document.getElementById("tts-pause-btn");
  if (speechSynthesis.paused) { speechSynthesis.resume(); if (pauseBtn) pauseBtn.textContent = "\u23F8"; }
  else                        { speechSynthesis.pause();  if (pauseBtn) pauseBtn.textContent = "\u25B6"; }
}

export function ttsStop() {
  if (speechSynthesis) speechSynthesis.cancel();
  _speaking = false;
  document.querySelectorAll(".tts-btn.speaking").forEach(b => b.classList.remove("speaking"));
  const player = document.getElementById("tts-player");
  if (player) player.classList.remove("active");
}

export function ttsCycleSpeed() {
  const idx = SPEEDS.indexOf(_speed);
  _speed = SPEEDS[(idx + 1) % SPEEDS.length];
  const speedBtn = document.getElementById("tts-speed-btn");
  if (speedBtn) speedBtn.textContent = _speed + "x";
  if (_utterance) _utterance.rate = _speed;
}

function _ttsCleanup(btn) {
  _speaking = false;
  if (btn) btn.classList.remove("speaking");
  document.querySelectorAll(".tts-btn.speaking").forEach(b => b.classList.remove("speaking"));
  const player = document.getElementById("tts-player");
  if (player) player.classList.remove("active");
}

// ── Voice input ───────────────────────────────────────────────────────────────

let _recognition = null;

export function startVoiceInput(btn, targetId) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Voice input not supported in this browser. Try Chrome or Edge.", "err"); return; }
  if (_recognition) { _recognition.stop(); _recognition = null; btn.classList.remove("recording"); return; }

  const target = document.getElementById(targetId); if (!target) return;
  _recognition = new SR();
  _recognition.lang = "en-AU";
  _recognition.continuous = true;
  _recognition.interimResults = true;
  btn.classList.add("recording");

  let finalTranscript = target.value;
  _recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalTranscript += (finalTranscript ? " " : "") + e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    target.value = finalTranscript + (interim ? " " + interim : "");
    target.dispatchEvent(new Event("input", { bubbles: true }));
  };
  _recognition.onerror = (e) => {
    if (e.error === "not-allowed") toast("Microphone access denied. Please allow microphone access.", "err");
    btn.classList.remove("recording"); _recognition = null;
  };
  _recognition.onend = () => { btn.classList.remove("recording"); _recognition = null; };
  _recognition.start();
}

// ── Add voice buttons to key fields ──────────────────────────────────────────

export function addVoiceButtons() {
  const fields = [
    { id: "url-input",     label: "Voice input for job URL"    },
    { id: "paste-input",   label: "Voice input for job text"   },
    { id: "search-input",  label: "Voice input for search"     },
    { id: "m-notes",       label: "Voice input for notes"      },
    { id: "new-key-input", label: "Voice input for API key"    },
  ];
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el || el.parentElement.querySelector(".voice-btn")) return;
    const wrap = el.parentElement;
    if (wrap) wrap.style.position = "relative";
    const btn = document.createElement("button");
    btn.className = "voice-btn";
    btn.type = "button";
    btn.innerHTML = "&#127908;";
    btn.title = f.label;
    btn.setAttribute("aria-label", f.label);
    btn.onclick = (e) => { e.preventDefault(); startVoiceInput(btn, f.id); };
    if (wrap) wrap.appendChild(btn);
  });
}
