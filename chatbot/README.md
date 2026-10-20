# Plantora Chatbot

A floating chatbot widget for the Plantora website. Visitors can ask about Plantora features or get plant care advice (watering, light, yellow leaves, pests, etc.). Powered by Anthropic Claude API.

## Folder Structure

```
chatbot/
├── widget/
│   ├── plantora-chat.js   # Frontend widget (floating button + chat panel)
│   └── test.html          # Test page for the widget
├── server/
│   ├── server.js          # Express backend (proxies to Anthropic API)
│   ├── knowledge.md       # Bot's "brain" — Plantora facts + plant care rules
│   ├── package.json       # Server dependencies & scripts
│   ├── .env.example       # Copy to .env and add your API key
│   └── .gitignore         # Ignores .env and node_modules
└── README.md              # This file
```

## Quick Start

### 1. Install server dependencies

```bash
cd chatbot/server
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and add your Anthropic API key:

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:3001`
- Health check: `GET /health`
- Chat endpoint: `POST /api/chat`

### 4. Test the widget

Open `chatbot/widget/test.html` in a browser (or serve it with Live Server). Click the green floating button at bottom-right.

## Integration

The widget is already added to all pages in `pages/` via this script tag (before `</body>`):

```html
<script src="../chatbot/widget/plantora-chat.js" data-api="http://localhost:3001/api/chat" defer></script>
```

The `data-api` attribute points to the local server. Change it for production.

## Customization

### Widget Appearance (`widget/plantora-chat.js`)

Edit the `CONFIG` object at the very top of `plantora-chat.js`:

```js
const CONFIG = {
  botName: "Plantora Bot",
  greeting: "Hi! I'm Plantora Bot 🌿 Ask me about Plantora or plant care!",
  suggestionChips: [
    "What is Plantora?",
    "Best low-light plants?",
    "Yellow leaves help",
    "How often to water?"
  ],
  placeholder: "Type your question...",
  primaryColor: "#2d5a3d",
  position: "right",        // "right" or "left"
  buttonSize: 56,
  apiEndpoint: "http://localhost:3001/api/chat"
};
```

Override via script tag attributes (no code edit needed):

```html
<script src="../chatbot/widget/plantora-chat.js"
        data-api="http://localhost:3001/api/chat"
        data-title="My Garden Bot"
        data-greeting="Welcome! Ask me anything."
        defer></script>
```

### Bot Knowledge & Behavior (`server/knowledge.md`)

Edit `knowledge.md` to change what the bot knows and how it behaves. Sections:

- **About Plantora** — project description
- **Website Pages** — list of pages and features
- **Features** — bullet list of capabilities
- **Plant Care Rules** — answer style, follow-up questions, decline rules
- **Things to Decline** — off-topic guardrails

The file is loaded at server startup and sent as the system prompt to Claude.

## Development Notes

- **Shadow DOM**: Widget uses Shadow DOM so styles never clash with `style/style.css`.
- **No dependencies**: Frontend is vanilla JS, single file.
- **Rate limiting**: 20 requests/minute per IP (in-memory).
- **Message history**: Last 12 messages sent to API, each truncated to 2000 chars.
- **CORS**: Limited to `ALLOWED_ORIGINS` (default: Live Server URLs).
- **Accessibility**: ARIA labels, keyboard navigation (Esc to close, Enter to send, Shift+Enter for newline), respects `prefers-reduced-motion`.

## Production Deployment

1. Set `ANTHROPIC_API_KEY` in your hosting environment.
2. Update `ALLOWED_ORIGINS` to your production domain(s).
3. Change `data-api` in the script tag to your production server URL.
4. Run `npm start` (or use a process manager like PM2).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "ANTHROPIC_API_KEY is not set" | Create `.env` in `chatbot/server/` with your key |
| CORS error | Check `ALLOWED_ORIGINS` includes your frontend URL |
| Widget not appearing | Check browser console; ensure script tag is before `</body>` |
| "Too many requests" | Wait a minute; rate limit is 20/min per IP |
| Server won't start | Run `npm install` in `chatbot/server/` first |