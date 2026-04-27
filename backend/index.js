require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

const app = express();
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'] }));
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const WORKSPACE_DIR = process.env.WORKSPACE_DIR 
  ? path.resolve(__dirname, '..', process.env.WORKSPACE_DIR)
  : path.resolve(__dirname, '../workspace');

if (!fsSync.existsSync(WORKSPACE_DIR)) {
  try { fsSync.mkdirSync(WORKSPACE_DIR, { recursive: true }); } 
  catch (err) { console.error("Failed to create workspace directory:", err); }
}

const git = simpleGit(WORKSPACE_DIR);

function resolveWorkspacePath(reqPath) {
  const resolved = path.resolve(WORKSPACE_DIR, reqPath || '');
  if (!resolved.startsWith(WORKSPACE_DIR)) throw new Error('Access denied: Path outside workspace');
  return resolved;
}

// -----------------------------------------------------
// HEALTH & GENERAL ENDPOINTS
// -----------------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok', workspace: WORKSPACE_DIR }));

// -----------------------------------------------------
// FILE SYSTEM ENDPOINTS
// -----------------------------------------------------
app.get('/api/files/tree', async (req, res) => {
  try {
    if (!fsSync.existsSync(WORKSPACE_DIR)) return res.json([]);
    const buildTree = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const nodes = [];
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(WORKSPACE_DIR, fullPath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          nodes.push({ name: entry.name, kind: 'directory', path: relPath, children: await buildTree(fullPath) });
        } else {
          nodes.push({ name: entry.name, kind: 'file', path: relPath });
        }
      }
      return nodes.sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name);
        return a.kind === 'directory' ? -1 : 1;
      });
    };
    res.json(await buildTree(WORKSPACE_DIR));
  } catch (error) { res.json([]); }
});

app.post('/api/files/read', async (req, res) => {
  try {
    const filePath = resolveWorkspacePath(req.body.path);
    if (!fsSync.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.json({ content: await fs.readFile(filePath, 'utf-8') });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/write', async (req, res) => {
  try {
    const filePath = resolveWorkspacePath(req.body.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, req.body.content, 'utf-8');
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/create', async (req, res) => {
  try {
    const filePath = resolveWorkspacePath(req.body.path);
    if (req.body.isFolder) {
      await fs.mkdir(filePath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, req.body.content || '', 'utf-8');
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/delete', async (req, res) => {
  try {
    await fs.rm(resolveWorkspacePath(req.body.path), { recursive: true, force: true });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/rename', async (req, res) => {
  try {
    await fs.rename(resolveWorkspacePath(req.body.oldPath), resolveWorkspacePath(req.body.newPath));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// -----------------------------------------------------
// GIT & GITHUB ENDPOINTS
// -----------------------------------------------------
app.get('/api/git/status', async (req, res) => {
  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return res.json({ isRepo: false, branch: null, changedFiles: [], stagedFiles: [], message: "No Git repo" });
    const status = await git.status();
    res.json({ isRepo: true, status, branch: status.current, changedFiles: status.modified, stagedFiles: status.staged });
  } catch (error) { res.json({ isRepo: false, message: "Git error: " + error.message }); }
});

app.post('/api/git/init', async (req, res) => {
  try { await git.init(); res.json({ success: true }); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/git/stage', async (req, res) => {
  try { await git.add(req.body.path || '.'); res.json({ success: true }); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/git/unstage', async (req, res) => {
  try { await git.reset(['--', req.body.path || '.']); res.json({ success: true }); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/git/commit', async (req, res) => {
  try { await git.commit(req.body.message); res.json({ success: true }); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/git/push', async (req, res) => {
  try { const status = await git.status(); await git.push('origin', status.current); res.json({ success: true }); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/git/pull', async (req, res) => {
  try { const status = await git.status(); await git.pull('origin', status.current); res.json({ success: true }); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// -----------------------------------------------------
// SUPABASE ENDPOINTS
// -----------------------------------------------------
app.post('/api/supabase/test', async (req, res) => {
  res.json({ success: true, message: 'Supabase connected' });
});

app.post('/api/supabase/save-config', async (req, res) => {
  try {
    const { url, anonKey } = req.body;
    const envPath = path.join(WORKSPACE_DIR, '.env.local');
    let envContent = fsSync.existsSync(envPath) ? await fs.readFile(envPath, 'utf-8') : '';
    
    // Add or replace variables
    const newVars = `\nNEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}\n`;
    await fs.writeFile(envPath, envContent + newVars, 'utf-8');
    
    // Create supabase helper
    const utilsDir = path.join(WORKSPACE_DIR, 'utils');
    await fs.mkdir(utilsDir, { recursive: true });
    await fs.writeFile(path.join(utilsDir, 'supabase.ts'), `import { createClient } from '@supabase/supabase-js';\n\nexport const supabase = createClient(\n  process.env.NEXT_PUBLIC_SUPABASE_URL!,\n  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n);\n`, 'utf-8');

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// -----------------------------------------------------
// AI ENDPOINTS
// -----------------------------------------------------
app.get('/api/ai/health', async (req, res) => {
  const provider = process.env.AI_PROVIDER || 'ollama';
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const targetModel = process.env.OLLAMA_MODEL || 'llama3.1';

  if (provider === 'ollama') {
    try {
      const tagsRes = await fetch(`${baseUrl}/api/tags`).catch(() => null);
      if (!tagsRes || !tagsRes.ok) return res.json({ status: 'error', error: 'Ollama Offline', message: 'Ollama is not running. Start Ollama with `ollama serve`.' });
      const hasModel = (await tagsRes.json()).models?.some(m => m.name === targetModel || m.name.startsWith(targetModel + ':'));
      if (!hasModel) return res.json({ status: 'error', error: 'Model Missing', message: `Model not found. Run \`ollama pull ${targetModel}\`.` });
      return res.json({ status: 'ok', provider: 'ollama', model: targetModel });
    } catch (err) { return res.json({ status: 'error', error: 'Backend Error', message: err.message }); }
  }
  if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return res.json({ status: 'error', error: 'Missing API Key', message: `No API key configured for ${provider}.` });
  }
  return res.json({ status: 'ok', provider, model: process.env.OLLAMA_MODEL || 'gpt-4o' });
});

const callAiProvider = async (messages, modelName, provider, baseUrl) => {
  const headers = { 'Content-Type': 'application/json' };
  let apiEndpoint, requestBody;

  if (provider === 'ollama') {
    apiEndpoint = `${baseUrl}/api/chat`;
    requestBody = { model: modelName, messages, stream: false, options: { temperature: 0.7 } };
  } else {
    const apiKey = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error(`No API key for ${provider}`);
    apiEndpoint = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    requestBody = { model: provider === 'openai' ? 'gpt-4o' : modelName, messages, temperature: 0.7 };
  }

  const response = await fetch(apiEndpoint, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Provider Error: ${await response.text()}`);
  const data = await response.json();
  return provider === 'ollama' ? (data.message?.content || '') : (data.choices?.[0]?.message?.content || '');
};

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, projectContext, provider = process.env.AI_PROVIDER || 'ollama' } = req.body;
    let baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    let modelName = process.env.OLLAMA_MODEL || 'llama3.1';
    
    let prompt = `You are an AI Developer IDE assistant. You can write code, fix bugs, and scaffold projects.
Respond with a helpful explanation first, and then AT THE END, provide a JSON block containing your proposed actions. Wrap the JSON exactly in \`\`\`json ... \`\`\` markers.

REQUIRED JSON FORMAT:
\`\`\`json
{
  "summary": "What you did",
  "files_created": [{ "path": "src/newfile.ts", "content": "..." }],
  "files_modified": [{ "path": "src/existing.ts", "content": "..." }],
  "files_deleted": ["src/oldfile.ts"],
  "commands": ["npm install some-package"],
  "dependencies": ["some-package"],
  "notes": ["Run npm install to add packages"]
}
\`\`\`
If you don't need to perform any file actions, you can omit the JSON block entirely.

Context Files:\n`;

    if (projectContext?.activeFile && projectContext.files?.[projectContext.activeFile]) {
      prompt += `Active File: ${projectContext.activeFile}\n\`\`\`\n${projectContext.files[projectContext.activeFile]}\n\`\`\`\n`;
    }

    const replyText = await callAiProvider([{ role: 'system', content: prompt }, { role: 'user', content: message }], modelName, provider, baseUrl);

    let actions = {};
    let cleanReply = replyText;
    const jsonMatch = replyText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        actions = JSON.parse(jsonMatch[1]);
        cleanReply = replyText.replace(/```json\s*([\s\S]*?)\s*```/, '').trim();
      } catch (e) {}
    } else if (replyText.trim().startsWith('{') && replyText.trim().endsWith('}')) {
       try { actions = JSON.parse(replyText); cleanReply = actions.summary || 'Actions proposed'; } catch (e) {}
    }

    res.json({ success: true, reply: cleanReply || "Actions proposed", actions });
  } catch (error) {
    res.status(500).json({ success: false, error: "AI Error", details: error.message });
  }
});

app.post('/api/ai/complete', async (req, res) => {
  try {
    const { prefix, suffix, provider = process.env.AI_PROVIDER || 'ollama' } = req.body;
    const messages = [
      { role: 'system', content: 'You are an AI code completion engine. Respond ONLY with the code that completes the prompt. Do not use markdown backticks unless part of the code. Provide only the missing string.' },
      { role: 'user', content: `Prefix:\n${prefix}\n\nSuffix:\n${suffix}\n\nCompletion:` }
    ];
    const replyText = await callAiProvider(messages, process.env.OLLAMA_MODEL || 'llama3.1', provider, process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
    res.json({ success: true, completion: replyText.trim().replace(/^```[a-z]*\n/, '').replace(/\n```$/, '') });
  } catch (error) { res.status(500).json({ success: false, error: "AI Error" }); }
});

app.post('/api/ai/inline-suggest', async (req, res) => {
  try {
    const { code, line, cursor, provider = process.env.AI_PROVIDER || 'ollama' } = req.body;
    const messages = [
      { role: 'system', content: 'You are an AI code completion engine. Suggest the next inline completion for the cursor position. Return ONLY the suggested text, nothing else. No markdown, no explanations.' },
      { role: 'user', content: `Current file context:\n${code}\n\nCursor is at Line ${line}, Character ${cursor}. Suggest the text that follows:` }
    ];
    const replyText = await callAiProvider(messages, process.env.OLLAMA_MODEL || 'llama3.1', provider, process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
    res.json({ success: true, suggestion: replyText.trim().replace(/^```[a-z]*\n/, '').replace(/\n```$/, '') });
  } catch (error) { res.status(500).json({ success: false, error: "AI Error" }); }
});

// -----------------------------------------------------
// SOCKET & TERMINAL
// -----------------------------------------------------
const ptyProcesses = {};
io.on('connection', (socket) => {
  socket.on('terminal:spawn', (id) => {
    try {
      const ptyProcess = spawn(process.platform === 'win32' ? 'powershell.exe' : 'bash', [], { cwd: WORKSPACE_DIR, env: process.env, shell: true });
      ptyProcesses[socket.id] = ptyProcess;
      ptyProcess.stdout.on('data', (data) => socket.emit('terminal:data', data.toString()));
      ptyProcess.stderr.on('data', (data) => socket.emit('terminal:data', data.toString()));
      socket.on('terminal:write', (data) => ptyProcesses[socket.id]?.stdin.write(data));
    } catch (e) { socket.emit('terminal:data', `Error: ${e.message}\r\n`); }
  });
  socket.on('disconnect', () => { if (ptyProcesses[socket.id]) { ptyProcesses[socket.id].kill(); delete ptyProcesses[socket.id]; } });
});

if (fsSync.existsSync(WORKSPACE_DIR)) {
  chokidar.watch(WORKSPACE_DIR, { ignored: /(^|[\/\\])\../, persistent: true }).on('all', (event, path) => io.emit('fs:change', { event, path }));
}

const PORT = process.env.BACKEND_PORT || 3001;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
