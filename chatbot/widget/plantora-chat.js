/* ============================================================
   Plantora AI Plant Care Chatbot Widget
   Powered by Google Gemini API
   ============================================================ */

(function () {
  "use strict";

  // Prevent duplicate initialization
  if (window.PlantoraChatbotInitialized) {
    console.log("[Plantora Chatbot] Already initialized, skipping.");
    return;
  }
  window.PlantoraChatbotInitialized = true;

  // ===== Configuration =====
  const CONFIG = {
    botName: "Plantora Care Assistant",
    botRole: "AI Plant Specialist • Online",
    greeting: "Hello! I'm your Plantora plant care specialist. Ask me anything about plant health, leaf symptoms, watering, light, diseases, or caring for your indoor plants!",
    placeholder: "Ask about plant health, watering, leaves...",
    primaryColor: "#4caf68",
    primaryHover: "#3d9b57",
    position: "right",
    buttonSize: 56,
    geminiApiKey: (function () {
      if (typeof window !== "undefined" && window.PlantoraConfig && typeof window.PlantoraConfig.getChatKey === "function") {
        return window.PlantoraConfig.getChatKey();
      }
      try {
        return atob("QVEuQWI4Uk42TGpaSUdEeWo4ZGJjWEFJYzNHa1pGejlxYlJNTU5zX3dRTXRiQW4tdDlLNFE=");
      } catch (e) {
        return "";
      }
    })(),
    models: [
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.8-flash"
    ],
    apiEndpoint: "http://localhost:3001/api/chat"
  };

  // Read script tag overrides
  const currentScript = document.currentScript;
  if (currentScript) {
    if (currentScript.dataset.api) CONFIG.apiEndpoint = currentScript.dataset.api;
    if (currentScript.dataset.title) CONFIG.botName = currentScript.dataset.title;
    if (currentScript.dataset.greeting) CONFIG.greeting = currentScript.dataset.greeting;
    if (currentScript.dataset.key) CONFIG.geminiApiKey = currentScript.dataset.key;
  }

  // System Prompt strictly enforcing plant care & botany scope
  const SYSTEM_INSTRUCTION = `
You are Plantora AI, a friendly, certified plant pathologist, botanist, and indoor gardening specialist for the Plantora platform.

YOUR PURPOSE & STRICT SCOPE:
Your knowledge and conversation are EXCLUSIVELY dedicated to:
1. Plant health care: diagnosing plant diseases, yellowing leaves, brown tips, drooping, leaf spots, mildew, fungal issues, and root rot.
2. Proper plant cultivation: watering routines, light requirements, soil drainage, humidity, temperature, pruning, and fertilizers.
3. Botanical information: identifying indoor/outdoor plant species, toxicity to pets, propagation, and growth habits.
4. Plantora platform features: My Plants library, care reminders, recommendations survey, and the AI Plant Identification tool.

STRICT GUARDRAIL:
If the user asks about ANY topic unrelated to plants, gardening, botany, or Plantora (e.g. politics, coding, general news, sports, movies, math, medical advice for humans, personal advice), you MUST politely and warmly decline and steer the conversation back to plants.
Example response to off-topic query:
"I am Plantora's dedicated plant care specialist! I only answer questions regarding plant health, gardening, botany, and plant care. How can I help your green companions today?"

STYLE & FORMATTING:
- Keep responses friendly, encouraging, and actionable.
- Use **bold** for key concepts and plant names.
- Use clean bullet points for steps or multi-item recommendations.
- Keep answers concise (under 180 words) unless the user requests in-depth technical details.
`;

  // Curated Contextual Suggestions Catalog
  const TOPIC_SUGGESTIONS = {
    default: [
      { text: "Why are my plant leaves yellowing?", icon: "🍂" },
      { text: "How often should I water indoor plants?", icon: "💧" },
      { text: "Best low-light plants for bedrooms", icon: "☀️" },
      { text: "How to identify & treat root rot", icon: "🪴" },
      { text: "How to get rid of fungus gnats & pests", icon: "🐛" },
      { text: "How does Plantora Identify work?", icon: "🔍" }
    ],
    watering: [
      { text: "How do I do the finger soil moisture test?", icon: "💧" },
      { text: "Signs of overwatering vs underwatering", icon: "🍂" },
      { text: "How to save an overwatered plant", icon: "🪴" },
      { text: "What water temperature is best for plants?", icon: "🚰" }
    ],
    yellow_leaves: [
      { text: "Should I cut off completely yellow leaves?", icon: "✂️" },
      { text: "Could yellow leaves be a nitrogen deficiency?", icon: "🧪" },
      { text: "How to check if the roots have rotted", icon: "🪴" },
      { text: "Is it normal for older leaves to shed?", icon: "🌿" }
    ],
    light: [
      { text: "What is the difference between direct & indirect light?", icon: "☀️" },
      { text: "Can plants thrive with LED grow lights?", icon: "💡" },
      { text: "Plants that tolerate windowless rooms", icon: "🚪" },
      { text: "Symptoms of leaf sunburn / scorching", icon: "🔥" }
    ],
    pests: [
      { text: "How to apply organic neem oil spray", icon: "🧴" },
      { text: "How to isolate and quarantine infected plants", icon: "🛡️" },
      { text: "How to get rid of spider mites permanently", icon: "🕸️" },
      { text: "Sticky traps for indoor fungus gnats", icon: "🪰" }
    ],
    repotting: [
      { text: "What is the best well-draining soil mix recipe?", icon: "🪴" },
      { text: "Signs my plant is root-bound", icon: "🌿" },
      { text: "Choosing the right pot with drainage holes", icon: "🏺" },
      { text: "Best time of year to repot indoor plants", icon: "📅" }
    ],
    monstera: [
      { text: "How to encourage larger fenestrated leaves on Monstera?", icon: "🌿" },
      { text: "How to care for Monstera aerial roots", icon: "🪴" },
      { text: "How often to wipe dust off Monstera leaves", icon: "✨" }
    ],
    snake_plant: [
      { text: "Why are my Snake Plant leaves getting soft or wrinkled?", icon: "💧" },
      { text: "Can a Snake Plant survive 3 weeks without water?", icon: "🌵" },
      { text: "How to propagate Snake Plant cuttings", icon: "✂️" }
    ]
  };

  // Helper: Detect topic from conversation text to update suggestion bubbles
  function getRelevantSuggestions(text = "") {
    const lower = text.toLowerCase();
    let suggestions = [];

    if (lower.includes("yellow") || lower.includes("chlorosis") || lower.includes("pale")) {
      suggestions = TOPIC_SUGGESTIONS.yellow_leaves;
    } else if (lower.includes("water") || lower.includes("moist") || lower.includes("drown") || lower.includes("rot")) {
      suggestions = TOPIC_SUGGESTIONS.watering;
    } else if (lower.includes("light") || lower.includes("sun") || lower.includes("dark") || lower.includes("window")) {
      suggestions = TOPIC_SUGGESTIONS.light;
    } else if (lower.includes("pest") || lower.includes("bug") || lower.includes("gnat") || lower.includes("mite") || lower.includes("aphid")) {
      suggestions = TOPIC_SUGGESTIONS.pests;
    } else if (lower.includes("repot") || lower.includes("soil") || lower.includes("pot") || lower.includes("drainage")) {
      suggestions = TOPIC_SUGGESTIONS.repotting;
    } else if (lower.includes("monstera")) {
      suggestions = TOPIC_SUGGESTIONS.monstera;
    } else if (lower.includes("snake plant") || lower.includes("sansevieria")) {
      suggestions = TOPIC_SUGGESTIONS.snake_plant;
    }

    // Merge with recent inquiries from localStorage if available
    const recents = getRecentInquiries();
    const recentBubbles = recents.slice(0, 2).map(r => ({ text: r, icon: "🕒" }));

    // Return combined or default
    const combined = [...recentBubbles, ...(suggestions.length ? suggestions : TOPIC_SUGGESTIONS.default)];
    // Deduplicate
    const seen = new Set();
    return combined.filter(item => {
      if (seen.has(item.text)) return false;
      seen.add(item.text);
      return true;
    }).slice(0, 6);
  }

  // Helper: Read & write recent queries in localStorage
  function getRecentInquiries() {
    try {
      return JSON.parse(localStorage.getItem("plantora_recent_chat_queries") || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveRecentInquiry(query) {
    if (!query || query.length < 4) return;
    try {
      let list = getRecentInquiries();
      // Remove duplicate
      list = list.filter(q => q.toLowerCase() !== query.toLowerCase());
      list.unshift(query);
      if (list.length > 8) list = list.slice(0, 8);
      localStorage.setItem("plantora_recent_chat_queries", JSON.stringify(list));
    } catch (e) {}
  }

  // Helper: Secure Markdown Parser
  function parseMarkdown(text) {
    if (!text) return "";
    // Escape HTML first to prevent XSS
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Line breaks and list formatting
    const lines = html.split("\n");
    let inList = false;
    let listType = null;
    let formattedLines = [];

    for (let line of lines) {
      const trimmed = line.trim();

      // Bullet lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
        if (!inList || listType !== "ul") {
          if (inList) formattedLines.push(`</${listType}>`);
          formattedLines.push('<ul class="chat-list">');
          inList = true;
          listType = "ul";
        }
        formattedLines.push(`<li>${trimmed.substring(2)}</li>`);
      }
      // Numbered lists
      else if (/^\d+\.\s+/.test(trimmed)) {
        if (!inList || listType !== "ol") {
          if (inList) formattedLines.push(`</${listType}>`);
          formattedLines.push('<ol class="chat-list">');
          inList = true;
          listType = "ol";
        }
        const itemText = trimmed.replace(/^\d+\.\s+/, "");
        formattedLines.push(`<li>${itemText}</li>`);
      }
      // Normal paragraph
      else {
        if (inList) {
          formattedLines.push(`</${listType}>`);
          inList = false;
          listType = null;
        }
        if (trimmed) {
          formattedLines.push(`<p>${trimmed}</p>`);
        }
      }
    }
    if (inList) formattedLines.push(`</${listType}>`);

    return formattedLines.join("");
  }

  // Helper: Call Gemini API directly with model fallback
  async function callGeminiChat(messagesHistory) {
    // Format Gemini contents payload
    const contents = messagesHistory.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const requestBody = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600
      }
    };

    let lastError = null;

    for (const model of CONFIG.models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${CONFIG.geminiApiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Plantora Chatbot] Model ${model} returned ${response.status}:`, errText);
          lastError = new Error(`API Error ${response.status}: ${errText}`);
          continue;
        }

        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!replyText) {
          throw new Error("Empty reply from model");
        }
        return replyText.trim();
      } catch (err) {
        console.warn(`[Plantora Chatbot] ${model} failed:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error("Failed to reach Plantora AI. Please check your internet connection.");
  }

  // ===== Mount Chatbot Widget Safely =====
  function initWidget() {
    if (document.getElementById("plantora-chatbot-host")) return;
    if (!document.body) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initWidget, { once: true });
      } else {
        setTimeout(initWidget, 50);
      }
      return;
    }

    // Create Host & Shadow DOM
    const host = document.createElement("div");
    host.id = "plantora-chatbot-host";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

  // ===== Injected Styles =====
  const style = document.createElement("style");
  style.textContent = `
    [hidden] { display: none !important; }

    :host {
      --primary: ${CONFIG.primaryColor};
      --primary-hover: ${CONFIG.primaryHover};
      --primary-dark: #222222;
      --primary-light: #e8f5e9;
      --bg: #ffffff;
      --surface: #f9fbf9;
      --text: #222222;
      --text-muted: #5c6355;
      --border: #e1eee4;
      --shadow: 0 16px 40px -12px rgba(34, 64, 45, 0.22);
      --radius: 18px;
      --radius-sm: 10px;
      --radius-full: 999px;
      --font: "Inter", system-ui, -apple-system, sans-serif;
      --font-heading: "Fraunces", Georgia, serif;
      --transition: 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      --btn-size: ${CONFIG.buttonSize}px;
      --panel-width: 380px;
      --panel-height: 540px;
    }

    @media (prefers-reduced-motion: reduce) {
      :host { --transition: 0s; }
    }

    /* ---- Floating Action Button ---- */
    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      width: var(--btn-size);
      height: var(--btn-size);
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
      color: #222222;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(76, 175, 104, 0.45);
      transition: transform var(--transition), box-shadow var(--transition);
    }

    .fab:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 14px 32px rgba(76, 175, 104, 0.55);
    }

    .fab:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 3px;
    }

    .fab svg {
      width: 26px;
      height: 26px;
      stroke: #222222;
      flex-shrink: 0;
      transition: transform var(--transition);
    }

    .fab:hover svg {
      transform: rotate(10deg);
    }

    /* Online status pulse badge on FAB */
    .fab-badge {
      position: absolute;
      top: 3px;
      right: 3px;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background-color: #22c55e;
      border: 2px solid #ffffff;
      box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
      animation: pulseGreen 2.2s infinite;
    }

    @keyframes pulseGreen {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    /* ---- Chat Window Panel ---- */
    .panel {
      position: fixed;
      bottom: calc(var(--btn-size) + 36px);
      right: 24px;
      width: var(--panel-width);
      height: var(--panel-height);
      background: var(--bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.96);
      transition: opacity var(--transition), visibility var(--transition), transform var(--transition);
      z-index: 9998;
    }

    .panel.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    @media (max-width: 440px) {
      :host {
        --panel-width: calc(100vw - 32px);
        --panel-height: calc(100vh - 110px);
      }
      .panel {
        bottom: calc(var(--btn-size) + 16px);
        right: 16px;
        left: 16px;
      }
    }

    /* ---- Header ---- */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
      color: #222222;
      border-radius: var(--radius) var(--radius) 0 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .header__left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header__avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #ffffff;
      color: #166534;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      position: relative;
    }

    .header__avatar::after {
      content: "";
      position: absolute;
      bottom: 0;
      right: 0;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #16a34a;
      border: 1.5px solid #ffffff;
    }

    .header__text {
      display: flex;
      flex-direction: column;
    }

    .header__title {
      font-family: var(--font);
      font-weight: 700;
      font-size: 0.95rem;
      color: #222222;
      line-height: 1.2;
    }

    .header__subtitle {
      font-family: var(--font);
      font-size: 0.72rem;
      color: #1b4d27;
      font-weight: 600;
    }

    .header__actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .header__btn {
      background: none;
      border: none;
      color: #222222;
      cursor: pointer;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background var(--transition);
    }

    .header__btn:hover {
      background: rgba(34, 34, 34, 0.12);
    }

    .header__btn svg {
      width: 17px;
      height: 17px;
    }

    /* ---- Messages Container ---- */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: var(--surface);
    }

    .msg {
      display: flex;
      gap: 8px;
      max-width: 86%;
      animation: msgPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes msgPop {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .msg--bot {
      align-self: flex-start;
    }

    .msg--user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .msg__avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      background: #ffffff;
      border: 1px solid var(--border);
      color: var(--primary);
    }

    .msg--user .msg__avatar {
      background: var(--primary);
      color: #222222;
      border-color: var(--primary);
    }

    .msg__bubble {
      padding: 10px 14px;
      border-radius: var(--radius);
      font-family: var(--font);
      font-size: 0.88rem;
      line-height: 1.52;
      word-break: break-word;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .msg--bot .msg__bubble {
      background: #ffffff;
      color: var(--text);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }

    .msg--user .msg__bubble {
      background: var(--primary);
      color: #222222;
      border-bottom-right-radius: 4px;
      font-weight: 500;
    }

    /* Markdown styling inside messages */
    .msg__bubble p { margin: 0 0 6px; }
    .msg__bubble p:last-child { margin-bottom: 0; }
    .msg__bubble strong { font-weight: 700; color: #166534; }
    .msg--user .msg__bubble strong { color: #000000; }
    .msg__bubble em { font-style: italic; }
    .msg__bubble code {
      background-color: rgba(0, 0, 0, 0.06);
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.82rem;
    }
    .msg__bubble .chat-list {
      margin: 4px 0 6px 18px;
      padding: 0;
      list-style-type: disc;
    }
    .msg__bubble ol.chat-list {
      list-style-type: decimal;
    }
    .msg__bubble .chat-list li {
      margin-bottom: 3px;
    }

    /* ---- Typing Indicator ---- */
    .typing {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 8px 14px;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      margin-left: 36px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    }

    .typing span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary);
      animation: typingPulse 1.3s infinite ease-in-out both;
    }

    .typing span:nth-child(2) { animation-delay: 0.18s; }
    .typing span:nth-child(3) { animation-delay: 0.36s; }

    @keyframes typingPulse {
      0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    /* ============================================================
       SUGGESTION BUBBLES BAR ABOVE THE TEXTBAR
       ============================================================ */
    .suggestion-bar {
      border-top: 1px solid var(--border);
      background: #ffffff;
      padding: 8px 12px 6px;
      position: relative;
    }

    .suggestion-bar__label {
      font-family: var(--font);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2px;
    }

    .suggestion-bubbles {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scroll-behavior: smooth;
      padding-bottom: 4px;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
    }

    .suggestion-bubbles::-webkit-scrollbar {
      height: 4px;
    }

    .suggestion-bubbles::-webkit-scrollbar-thumb {
      background-color: var(--border);
      border-radius: 999px;
    }

    .suggestion-bubble {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--primary-light);
      color: #1b5e20;
      border: 1px solid #cce5d2;
      border-radius: var(--radius-full);
      padding: 5px 11px;
      font-family: var(--font);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.18s ease;
      flex-shrink: 0;
    }

    .suggestion-bubble:hover {
      background: var(--primary);
      color: #222222;
      border-color: var(--primary);
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(76, 175, 104, 0.25);
    }

    .suggestion-bubble:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .suggestion-bubble__icon {
      font-size: 0.9rem;
      line-height: 1;
    }

    /* ---- Textbar / Input Area ---- */
    .input-wrap {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 10px 14px 12px;
      border-top: 1px solid var(--border);
      background: var(--bg);
    }

    .input-wrap textarea {
      flex: 1;
      min-height: 40px;
      max-height: 100px;
      resize: none;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 9px 14px;
      font-family: var(--font);
      font-size: 0.88rem;
      color: var(--text);
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
      line-height: 1.4;
      background: var(--surface);
    }

    .input-wrap textarea:focus {
      border-color: var(--primary);
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(76, 175, 104, 0.15);
    }

    .input-wrap textarea::placeholder {
      color: #8c9688;
      font-size: 0.85rem;
    }

    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: var(--primary);
      color: #222222;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition);
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(76, 175, 104, 0.3);
    }

    .send-btn:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: scale(1.06);
    }

    .send-btn:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .send-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }

    .send-btn svg {
      width: 18px;
      height: 18px;
      stroke: #222222;
    }

    /* ---- Error Notice ---- */
    .toast {
      position: absolute;
      top: 60px;
      left: 12px;
      right: 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-family: var(--font);
      font-size: 0.8rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      animation: toastSlide 0.25s ease;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    @keyframes toastSlide {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  shadow.appendChild(style);

  // ===== SVG Icons =====
  const ICONS = {
    sprout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
  };

  // ===== State =====
  let isOpen = false;
  let isSending = false;
  let messageHistory = []; // [{role: "user"|"assistant", content: string}]

  // Restore history from sessionStorage if available
  try {
    const saved = sessionStorage.getItem("plantora_chat_history");
    if (saved) messageHistory = JSON.parse(saved);
  } catch (e) {}

  // ===== Create UI Elements =====

  // 1. Floating Action Button
  const fab = document.createElement("button");
  fab.className = "fab";
  fab.setAttribute("aria-label", "Open Plantora Plant Care Assistant");
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = `${ICONS.sprout}<span class="fab-badge"></span>`;
  fab.addEventListener("click", togglePanel);

  // 2. Chat Panel
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "plantora-chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Plantora Plant Care Assistant");

  // 3. Header
  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `
    <div class="header__left">
      <div class="header__avatar">🌿</div>
      <div class="header__text">
        <span class="header__title">${CONFIG.botName}</span>
        <span class="header__subtitle">${CONFIG.botRole}</span>
      </div>
    </div>
    <div class="header__actions">
      <button type="button" class="header__btn" id="btn-clear-chat" title="Clear Conversation" aria-label="Clear Conversation">
        ${ICONS.trash}
      </button>
      <button type="button" class="header__btn" id="btn-close-chat" title="Close" aria-label="Close Chat">
        ${ICONS.close}
      </button>
    </div>
  `;

  // 4. Messages Container
  const messagesContainer = document.createElement("div");
  messagesContainer.className = "messages";
  messagesContainer.setAttribute("role", "log");
  messagesContainer.setAttribute("aria-live", "polite");

  // 5. Typing Indicator
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "typing";
  typingIndicator.hidden = true;
  typingIndicator.innerHTML = `<span></span><span></span><span></span>`;

  // 6. SUGGESTION BUBBLE BAR (Positioned directly above the textbar)
  const suggestionBar = document.createElement("div");
  suggestionBar.className = "suggestion-bar";
  suggestionBar.innerHTML = `
    <div class="suggestion-bar__label">
      <span>Suggested Plant Topics</span>
    </div>
    <div class="suggestion-bubbles" id="suggestion-bubbles-row"></div>
  `;
  const suggestionBubblesRow = suggestionBar.querySelector("#suggestion-bubbles-row");

  // 7. Input Wrap / Textbar
  const inputWrap = document.createElement("div");
  inputWrap.className = "input-wrap";
  inputWrap.innerHTML = `
    <textarea placeholder="${CONFIG.placeholder}" rows="1" aria-label="Your plant question"></textarea>
    <button type="button" class="send-btn" aria-label="Send message" disabled>${ICONS.send}</button>
  `;

  const textarea = inputWrap.querySelector("textarea");
  const sendBtn = inputWrap.querySelector(".send-btn");

  // Assemble panel
  panel.appendChild(header);
  panel.appendChild(messagesContainer);
  panel.appendChild(typingIndicator);
  panel.appendChild(suggestionBar);
  panel.appendChild(inputWrap);

  shadow.appendChild(fab);
  shadow.appendChild(panel);

  // ===== Event Handlers =====

  header.querySelector("#btn-close-chat").addEventListener("click", closePanel);
  header.querySelector("#btn-clear-chat").addEventListener("click", () => {
    messageHistory = [];
    try { sessionStorage.removeItem("plantora_chat_history"); } catch (e) {}
    messagesContainer.innerHTML = "";
    addBotMessage(CONFIG.greeting);
    renderSuggestionBubbles(getRelevantSuggestions());
  });

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
    sendBtn.disabled = !textarea.value.trim() || isSending;
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = textarea.value.trim();
      if (text && !isSending) {
        handleUserSend(text);
      }
    }
  });

  sendBtn.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (text && !isSending) {
      handleUserSend(text);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  // ===== Render Suggestion Bubbles =====
  function renderSuggestionBubbles(suggestions) {
    if (!suggestionBubblesRow) return;
    suggestionBubblesRow.innerHTML = "";

    suggestions.forEach(item => {
      const bubble = document.createElement("button");
      bubble.type = "button";
      bubble.className = "suggestion-bubble";
      bubble.innerHTML = `<span class="suggestion-bubble__icon">${item.icon || "🌿"}</span> <span>${item.text}</span>`;
      bubble.addEventListener("click", () => {
        handleUserSend(item.text);
      });
      suggestionBubblesRow.appendChild(bubble);
    });

    // Scroll to start
    suggestionBubblesRow.scrollLeft = 0;
  }

  // ===== Panel Open/Close =====
  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }

  function openPanel(prefillQuestion) {
    isOpen = true;
    fab.setAttribute("aria-expanded", "true");
    fab.innerHTML = `${ICONS.close}`;
    panel.classList.add("open");

    // If chat empty, load greeting or previous history
    if (messagesContainer.children.length === 0) {
      if (messageHistory.length > 0) {
        messageHistory.forEach(m => {
          if (m.role === "user") addUserMessage(m.content, false);
          else addBotMessage(m.content, false);
        });
      } else {
        addBotMessage(CONFIG.greeting, false);
      }
    }

    // Populate suggestions
    const lastUserMsg = [...messageHistory].reverse().find(m => m.role === "user");
    renderSuggestionBubbles(getRelevantSuggestions(lastUserMsg ? lastUserMsg.content : ""));

    scrollToBottom();
    setTimeout(() => {
      if (prefillQuestion) {
        textarea.value = prefillQuestion;
        textarea.dispatchEvent(new Event("input"));
        handleUserSend(prefillQuestion);
      } else {
        textarea.focus();
      }
    }, 250);
  }

  function closePanel() {
    isOpen = false;
    fab.setAttribute("aria-expanded", "false");
    fab.innerHTML = `${ICONS.sprout}<span class="fab-badge"></span>`;
    panel.classList.remove("open");
  }

  // ===== Message Rendering =====
  function addBotMessage(text, save = true) {
    const msg = document.createElement("div");
    msg.className = "msg msg--bot";
    msg.innerHTML = `
      <div class="msg__avatar">🌿</div>
      <div class="msg__bubble">${parseMarkdown(text)}</div>
    `;
    messagesContainer.appendChild(msg);
    scrollToBottom();

    if (save) {
      messageHistory.push({ role: "assistant", content: text });
      persistHistory();
    }
  }

  function addUserMessage(text, save = true) {
    const msg = document.createElement("div");
    msg.className = "msg msg--user";
    msg.innerHTML = `
      <div class="msg__bubble">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      <div class="msg__avatar">👤</div>
    `;
    messagesContainer.appendChild(msg);
    scrollToBottom();

    if (save) {
      messageHistory.push({ role: "user", content: text });
      saveRecentInquiry(text);
      persistHistory();
    }
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTyping(show) {
    typingIndicator.hidden = !show;
    if (show) scrollToBottom();
  }

  function persistHistory() {
    try {
      if (messageHistory.length > 20) {
        messageHistory = messageHistory.slice(-20);
      }
      sessionStorage.setItem("plantora_chat_history", JSON.stringify(messageHistory));
    } catch (e) {}
  }

  function showToastError(msgText) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${msgText}</span>`;
    panel.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // ===== Handle Send =====
  async function handleUserSend(text) {
    if (!text || isSending) return;

    isSending = true;
    sendBtn.disabled = true;
    textarea.value = "";
    textarea.style.height = "auto";

    // Append user message
    addUserMessage(text, true);

    // Show typing dots
    showTyping(true);

    try {
      // Call Gemini API
      const reply = await callGeminiChat(messageHistory);
      showTyping(false);
      addBotMessage(reply, true);

      // Update suggestion bubbles dynamically based on new topic!
      renderSuggestionBubbles(getRelevantSuggestions(text + " " + reply));
    } catch (err) {
      showTyping(false);
      console.error("[Plantora Chatbot] Error:", err);
      showToastError("Couldn't reach the assistant. Please try again.");

      // Remove failed user prompt from history
      if (messageHistory.length && messageHistory[messageHistory.length - 1].role === "user") {
        messageHistory.pop();
        persistHistory();
      }
    } finally {
      isSending = false;
      sendBtn.disabled = !textarea.value.trim();
      textarea.focus();
    }
  }

    // Expose helper on window
    window.PlantoraChatbot = {
      open: openPanel,
      close: closePanel,
      toggle: togglePanel,
      send: handleUserSend
    };

    // Initial bubble render
    renderSuggestionBubbles(getRelevantSuggestions());
  }

  // Global event delegation to open chat from any button or link with data-open-chat or relevant class/id
  document.addEventListener("click", function (event) {
    const trigger = event.target.closest("[data-open-chat], .btn-open-chat, #btn-hero-chat, #btn-quick-chat, .nav-chat-trigger");
    if (trigger) {
      event.preventDefault();
      const question = trigger.getAttribute("data-chat-prompt") || "";
      if (window.PlantoraChatbot && typeof window.PlantoraChatbot.open === "function") {
        window.PlantoraChatbot.open(question);
      }
    }
  });

  // Start initialization when DOM is ready
  if (document.readyState === "loading" || !document.body) {
    document.addEventListener("DOMContentLoaded", initWidget, { once: true });
  } else {
    initWidget();
  }
})();