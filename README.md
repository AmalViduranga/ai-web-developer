# CodeForge AI IDE

A scalable, local-first AI-powered development platform built with Next.js, React, Express, and Monaco Editor. 
This IDE allows you to generate, edit, run, debug, and manage full-stack projects using a true local backend, connected to **Ollama** or cloud LLMs.

## Features

- **Real Local Execution**: No browser limitations. Uses a local Node.js Express backend and WebSockets to spin up a true local terminal (`powershell` / `bash`) and interact with the local filesystem.
- **Ollama Local LLM First**: Defaults to your local Ollama instance (no API keys required), fully compatible with `llama3.1` or `codellama`.
- **Git Integration**: Full Source Control panel to view branches, modified files, and initialize repositories using `simple-git`.
- **Context-Aware AI Chat**: AI intelligently scaffolds projects and rewrites files using structured JSON diffs.
- **Premium UI**: CodeForge features an ultra-sleek indigo-dark VS Code/Cursor aesthetic.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- **Ollama** (for local AI) or an API Key from OpenAI/OpenRouter.

### Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Copy the example config:
   ```bash
   cp .env.example .env
   ```

3. **Install Ollama** (Required for Local AI):
   - Download and install [Ollama](https://ollama.com).
   - Open your standard terminal and run the background service:
     ```bash
     ollama serve
     ```
   - In another terminal, pull the default model:
     ```bash
     ollama pull llama3.1
     ```

### Running the IDE

Start both the Next.js Frontend and the Express Backend simultaneously:
```bash
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

### Testing the System

You can manually verify that your components are running:
1. **Backend Health Check**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
2. **AI Health Check**: [http://localhost:3001/api/ai/health](http://localhost:3001/api/ai/health)

## How to Use the AI

1. Open the **AI Assistant** tab on the left. The top badge should say "✅ Ready".
2. Type: *"Create an Express API with a /todos endpoint"*
3. The AI will stream back structured JSON. Review the proposed changes and click **Apply Changes**.
4. Switch to the **Terminal** tab at the bottom and run `npm install` and `npm run dev`.
5. Click the **Run** button at the top to pop open the Live Preview.
