/* ============================================================
   Plantora Chatbot Widget — CONFIG (edit these to customize)
   ============================================================ */
const CONFIG = {
  // Bot identity
  botName: "Plantora Bot",
  // Greeting shown when chat opens
  greeting: "Hi! I'm Plantora Bot 🌿 Ask me about Plantora or plant care!",
  // Clickable suggestion chips shown under greeting
  suggestionChips: [
    "What is Plantora?",
    "Best low-light plants?",
    "Yellow leaves help",
    "How often to water?"
  ],
  // Input placeholder text
  placeholder: "Type your question...",
  // Primary color (green theme matching Plantora)
  primaryColor: "#4caf68",
  // Button position: "right" or "left"
  position: "right",
  // Floating button size in pixels
  buttonSize: 56,
  // API endpoint (can be overridden via data-api attribute)
  apiEndpoint: "http://localhost:3001/api/chat",
  // true = show a "coming soon" message instead of calling the server;
  // set to false when the server and API key are ready
  comingSoon: true
};

/* ============================================================
   Implementation — do not edit below unless you know JS
   ============================================================ */

// Prevent double initialization if script tag is included twice
if (window.PlantoraChatbotInitialized) {
  console.log("[Plantora Chatbot] Already initialized, skipping.");
} else {
  window.PlantoraChatbotInitialized = true;

  // ===== Read overrides from script tag attributes =====
  const scriptTag = document.currentScript;
  if (scriptTag) {
    if (scriptTag.dataset.api) CONFIG.apiEndpoint = scriptTag.dataset.api;
    if (scriptTag.dataset.title) CONFIG.botName = scriptTag.dataset.title;
    if (scriptTag.dataset.greeting) CONFIG.greeting = scriptTag.dataset.greeting;
  }

  // ===== Helper: create element with attributes =====
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "style") Object.assign(node.style, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    // Ensure children is always an array, handle SVG strings and text nodes
    [].concat(children).forEach(c => {
      if (c && c.nodeType) {
        node.append(c);
      } else if (typeof c === "string" && c.trim().startsWith("<svg")) {
        node.insertAdjacentHTML("beforeend", c);
      } else if (c !== undefined && c !== null) {
        node.append(document.createTextNode(String(c)));
      }
    });
    return node;
  }

  // ===== Create Shadow DOM host =====
  const host = document.createElement("div");
  host.id = "plantora-chatbot-host";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  // ===== Inject styles into Shadow DOM =====
  const style = document.createElement("style");
  style.textContent = `
    [hidden] { display: none !important; }
    /* ---- Variables ---- */
    :host {
      --primary: ${CONFIG.primaryColor};
      --primary-dark: #222222;
      --primary-light: #e8f5e9;
      --bg: #ffffff;
      --text: #222222;
      --text-muted: #5c6355;
      --border: #e1eee4;
      --shadow: 0 8px 24px -8px rgba(34, 64, 45, 0.16);
      --radius: 16px;
      --radius-full: 999px;
      --font: "Inter", system-ui, -apple-system, sans-serif;
      --transition: 0.2s ease;
      --btn-size: ${CONFIG.buttonSize}px;
      --panel-width: 360px;
      --panel-height: 480px;
    }

    @media (prefers-reduced-motion: reduce) {
      :host { --transition: 0s; }
    }

    /* ---- Floating button ---- */
    .fab {
      position: fixed;
      bottom: 24px;
      z-index: 9999;
      width: var(--btn-size);
      height: var(--btn-size);
      border-radius: 50%;
      background: var(--primary);
      color: #222222;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow);
      transition: transform var(--transition), box-shadow var(--transition);
    }
    .fab:hover { transform: scale(1.05); box-shadow: 0 12px 28px -8px rgba(34, 64, 45, 0.2); }
    .fab:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
    .right { right: 24px; }
    .left { left: 24px; }
    .fab svg { width: 24px; height: 24px; stroke: currentColor; flex-shrink: 0; }

    /* ---- Chat panel ---- */
    .panel {
      position: fixed;
      bottom: calc(var(--btn-size) + 32px);
      width: var(--panel-width);
      height: var(--panel-height);
      background: var(--bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(16px) scale(0.95);
      transition: opacity var(--transition), visibility var(--transition), transform var(--transition);
      z-index: 9998;
    }
    .panel.open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
    .panel.right { right: 24px; }
    .panel.left { left: 24px; }

    @media (max-width: 420px) {
      :host { --panel-width: calc(100vw - 32px); --panel-height: calc(100vh - 120px); }
      .panel { bottom: calc(var(--btn-size) + 16px); right: 16px; left: 16px; }
    }

    /* ---- Header ---- */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: var(--primary);
      color: #222222;
      border-radius: var(--radius) var(--radius) 0 0;
    }
    .header__title { font-family: var(--font); font-weight: 600; font-size: 0.95rem; }
    .header__close {
      background: none; border: none; color: #222222; cursor: pointer;
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      transition: background var(--transition);
    }
    .header__close:hover { background: rgba(34, 34, 34, 0.1); }
    .header__close:focus-visible { outline: 2px solid #222222; outline-offset: 2px; }
    .header__close svg { width: 20px; height: 20px; }

    /* ---- Messages area ---- */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .msg { display: flex; gap: 8px; max-width: 85%; animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .msg--bot { align-self: flex-start; }
    .msg--user { align-self: flex-end; flex-direction: row-reverse; }
    .msg__avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; background: var(--primary-light); color: var(--primary);
    }
    .msg--user .msg__avatar { background: var(--primary); color: #222222; }
    .msg__bubble {
      padding: 10px 14px; border-radius: var(--radius);
      font-family: var(--font); font-size: 0.9rem; line-height: 1.5;
      word-wrap: break-word;
    }
    .msg--bot .msg__bubble { background: var(--primary-light); color: var(--text); border-bottom-left-radius: 4px; }
    .msg--user .msg__bubble { background: var(--primary); color: #222222; border-bottom-right-radius: 4px; }

    /* ---- Suggestion chips ---- */
    .chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 12px; }
    .chip {
      background: var(--primary-light); color: var(--primary);
      border: 1px solid var(--border); border-radius: var(--radius-full);
      padding: 6px 12px; font-family: var(--font); font-size: 0.8rem; font-weight: 500;
      cursor: pointer; transition: background var(--transition), border-color var(--transition);
    }
    .chip:hover { background: var(--primary); color: #222222; border-color: var(--primary); }
    .chip:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

    /* ---- Typing indicator ---- */
    .typing { display: flex; gap: 4px; padding: 0 16px 8px; align-self: flex-start; }
    .typing span {
      width: 8px; height: 8px; border-radius: 50%; background: var(--primary);
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .typing span { animation: none; opacity: 0.5; } }

    /* ---- Input area ---- */
    .input-wrap { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg); }
    .input-wrap textarea {
      flex: 1; min-height: 44px; max-height: 120px; resize: none;
      border: 1px solid var(--border); border-radius: var(--radius-full);
      padding: 10px 14px; font-family: var(--font); font-size: 0.9rem; color: var(--text);
      outline: none; transition: border-color var(--transition), box-shadow var(--transition);
    }
    .input-wrap textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
    .input-wrap textarea::placeholder { color: var(--text-muted); }
    .send-btn {
      width: 44px; height: 44px; border-radius: 50%; border: none;
      background: var(--primary); color: #222222; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background var(--transition), transform var(--transition);
      flex-shrink: 0;
    }
    .send-btn:hover { background: var(--primary-dark); }
    .send-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .send-btn svg { width: 20px; height: 20px; }

    /* ---- Error toast ---- */
    .toast {
      position: fixed; bottom: calc(var(--btn-size) + 32px + var(--panel-height) + 16px);
      background: #a23b28; color: #fff; padding: 10px 14px; border-radius: 8px;
      font-family: var(--font); font-size: 0.85rem; box-shadow: var(--shadow);
      animation: slideUp 0.3s ease; z-index: 9997;
    }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .toast.right { right: 24px; } .toast.left { left: 24px; }
  `;
  shadow.appendChild(style);

  // ===== SVG Icons =====
  const ICONS = {
    leaf: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20a7 7 0 0 1-7-7c0-5 4-9 7-9s7 4 7 9a7 7 0 0 1-7 7z"/><path d="M11 2a3 3 0 0 0 0 6"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
  };

  // ===== State =====
  let isOpen = false;
  let messageHistory = []; // [{role, content}]
  let isSending = false;

  // ===== Build UI =====
  // Floating button
  const fab = el("button", {
    class: `fab ${CONFIG.position}`,
    "aria-label": `Open chat with ${CONFIG.botName}`,
    "aria-expanded": "false",
    "aria-controls": "plantora-chat-panel",
    onclick: togglePanel
  }, [ICONS.leaf]);

  // Panel
  const panel = el("div", {
    class: `panel ${CONFIG.position}`,
    id: "plantora-chat-panel",
    role: "dialog",
    "aria-label": `Chat with ${CONFIG.botName}`,
    "aria-modal": "true"
  });

  // Header
  const header = el("div", { class: "header" }, [
    el("span", { class: "header__title" }, CONFIG.botName),
    el("button", { class: "header__close", "aria-label": "Close chat", onclick: closePanel }, [ICONS.close])
  ]);

  // Messages
  const messages = el("div", { class: "messages", role: "log", "aria-live": "polite", "aria-atomic": "false" });

  // Chips
  const chipsContainer = el("div", { class: "chips", role: "list", "aria-label": "Suggested questions" });
  CONFIG.suggestionChips.forEach(text => {
    const chip = el("button", {
      class: "chip", role: "listitem", type: "button",
      onclick: () => sendMessage(text)
    }, text);
    chipsContainer.appendChild(chip);
  });

  // Typing indicator (hidden initially)
  const typing = el("div", { class: "typing", hidden: true, "aria-live": "polite" },
    [el("span"), el("span"), el("span")]);

  // Input area
  const textarea = el("textarea", {
    placeholder: CONFIG.placeholder,
    rows: 1,
    "aria-label": "Your message",
    onkeydown: handleKeydown
  });
  const sendBtn = el("button", {
    class: "send-btn",
    "aria-label": "Send message",
    onclick: () => sendMessage(textarea.value.trim()),
    disabled: true
  }, [ICONS.send]);
  const inputWrap = el("div", { class: "input-wrap" }, [textarea, sendBtn]);

  // Assemble panel
  panel.append(header, messages, chipsContainer, typing, inputWrap);

  // Add to shadow DOM
  shadow.appendChild(fab);
  shadow.appendChild(panel);

  // ===== Document-level Escape key to close panel =====
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  // ===== Auto-resize textarea =====
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    if (!CONFIG.comingSoon) {
      sendBtn.disabled = !textarea.value.trim() || isSending;
    }
  });

  // ===== Keyboard handling =====
  function handleKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = textarea.value.trim();
      if (text && !isSending) sendMessage(text);
    }
    if (e.key === "Escape") closePanel();
  }

  // ===== Toggle panel =====
  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }
  function openPanel() {
    isOpen = true;
    fab.setAttribute("aria-expanded", "true");
    panel.classList.add("open");
    // Add greeting on first open
    if (messages.children.length === 0) {
      addBotMessage(CONFIG.greeting);
      if (CONFIG.comingSoon) {
        // Show coming soon message and disable input
        addBotMessage("The Plantora assistant is coming soon. Stay tuned!");
        textarea.disabled = true;
        textarea.placeholder = "Coming soon...";
        sendBtn.disabled = true;
        chipsContainer.hidden = true;
      }
    }
    if (!CONFIG.comingSoon) {
      textarea.focus();
    }
  }
  function closePanel() {
    isOpen = false;
    fab.setAttribute("aria-expanded", "false");
    panel.classList.remove("open");
  }

  // ===== Add messages =====
  function addBotMessage(text) {
    const msg = el("div", { class: "msg msg--bot" }, [
      el("div", { class: "msg__avatar" }, "🌿"),
      el("div", { class: "msg__bubble" }, text)
    ]);
    messages.appendChild(msg);
    scrollToBottom();
  }
  function addUserMessage(text) {
    const msg = el("div", { class: "msg msg--user" }, [
      el("div", { class: "msg__bubble" }, text),
      el("div", { class: "msg__avatar" }, "👤")
    ]);
    messages.appendChild(msg);
    scrollToBottom();
  }
  function showTyping(show) {
    typing.hidden = !show;
    if (show) scrollToBottom();
  }
  function scrollToBottom() { messages.scrollTop = messages.scrollHeight; }

  // ===== Show error toast =====
  function showError(message) {
    const toast = el("div", { class: `toast ${CONFIG.position}`, role: "alert" }, message);
    shadow.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
  }

  // ===== Send message to API =====
  async function sendMessage(text) {
    if (!text || isSending) return;
    // If coming soon mode, do not send to server
    if (CONFIG.comingSoon) return;

    isSending = true;
    sendBtn.disabled = true;
    textarea.value = "";
    textarea.style.height = "auto";
    chipsContainer.hidden = true; // hide chips after first user message

    addUserMessage(text);
    messageHistory.push({ role: "user", content: text });
    showTyping(true);

    try {
      const response = await fetch(CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistory.slice(-12) }) // last 12 messages
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply?.trim() || "Sorry, I didn't get a response.";
      addBotMessage(reply);
      messageHistory.push({ role: "assistant", content: reply });
      // Keep history trimmed
      if (messageHistory.length > 12) messageHistory = messageHistory.slice(-12);
    } catch (err) {
      console.error("[Plantora Chatbot] API error:", err);
      // Remove the failed user message from history
      if (messageHistory.length > 0 && messageHistory[messageHistory.length - 1].role === "user") {
        messageHistory.pop();
      }
      showError("Couldn't reach the bot. Please try again later.");
    } finally {
      showTyping(false);
      isSending = false;
      sendBtn.disabled = !textarea.value.trim();
      textarea.focus();
    }
  }
}