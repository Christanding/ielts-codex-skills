import express from 'express';
import cors from 'cors';
import {
  loadSnapshot,
  loadProfile,
  loadScores,
  loadWriting,
  loadReading,
  loadListening,
  loadVocab,
  loadSpeaking,
  loadSynonyms,
  createScanContext,
} from './lib/scanner.js';
import { ensureDirs, IELTS_HOME } from './lib/paths.js';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));

ensureDirs();

// Wrap a sync loader so one bad ~/.ielts/ file can't 500 the whole endpoint.
function safeJson(loader, { attachIssues = false, createContext = true } = {}) {
  return (_req, res) => {
    const ctx = createContext ? createScanContext() : undefined;
    try {
      const data = createContext ? loader(ctx) : loader();
      if (attachIssues && data && typeof data === 'object' && !Array.isArray(data)) {
        res.json({ ...data, issues: ctx.issues, warnings: ctx.warnings });
      } else {
        res.json(data);
      }
    } catch (e) {
      console.error(`[server] ${loader.name} failed:`, e);
      res.status(500).json({ error: e.message, hint: '看终端日志，或跑 npm run validate 检查 ~/.ielts/ 数据文件。' });
    }
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ielts_home: IELTS_HOME });
});

app.get('/api/snapshot',  safeJson(loadSnapshot, { createContext: false }));
app.get('/api/profile',   safeJson(loadProfile));
app.get('/api/scores',    safeJson(loadScores, { attachIssues: true }));
app.get('/api/writing',   safeJson(loadWriting, { attachIssues: true }));
app.get('/api/reading',   safeJson(loadReading, { attachIssues: true }));
app.get('/api/listening', safeJson(loadListening, { attachIssues: true }));
app.get('/api/vocab',     safeJson(loadVocab));
app.get('/api/speaking',  safeJson(loadSpeaking, { attachIssues: true }));
app.get('/api/synonyms',  safeJson(loadSynonyms));

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  console.log(`[server] data dir: ${IELTS_HOME}`);
});
