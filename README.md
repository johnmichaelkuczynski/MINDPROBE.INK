# 🧠 Mind Reader — Cognitive & Psychological Profiler

Mind Reader is a professional-grade cognitive, psychological, and psychopathological analysis engine. Paste or upload any text sample and receive a deep, structured profile across six analysis types — powered by your choice of four state-of-the-art AI models with real-time streaming results.

---

## 🔍 Analysis Types

- **Cognitive** — Basic cognitive assessment with core intelligence metrics. Measures reasoning, abstraction, and conceptual precision.
- **Comprehensive Cognitive** — Four-phase deep cognitive analysis. Expands the core assessment with layered evaluation across multiple dimensions.
- **Psychological** — Personality and behavioural assessment. Identifies dispositional patterns, affect regulation, and interpersonal tendencies.
- **Comprehensive Psychological** — Multi-phase psychological profiling. Full-spectrum analysis of personality structure and behavioural drivers.
- **Psychopathological** — Clinical pathology assessment. Screens for markers consistent with recognised psychopathological presentations.
- **Comprehensive Psychopathological** — Detailed clinical assessment protocol. The most thorough analysis type, covering the full diagnostic landscape.

---

## ⚙️ How It Works

1. **Select an analysis type** from the six available profiles.
2. **Paste text** directly into the input area, or **drag and drop** a file (PDF, Word, or plain text — up to 10 MB).
3. **Choose an AI engine** (ZHI 1–4) based on your preferred reasoning style.
4. **Start the analysis** and watch results stream in real time as each question is processed.
5. **Use the dialogue system** to ask follow-up questions or request a regenerated analysis with specific concerns addressed.
6. **Download** the completed report at any time.

---

## 🤖 AI Engines (LLM Selection)

| Engine | Provider | Character |
|--------|----------|-----------|
| **ZHI 1** | OpenAI GPT | Primary analysis engine — balanced and precise |
| **ZHI 2** | Anthropic Claude | Alternative reasoning model — nuanced and thorough |
| **ZHI 3** | DeepSeek | Specialised profiling engine — pattern-focused |
| **ZHI 4** | Perplexity | Research-focused model — contextually grounded |

All four engines are fully interchangeable. Switch between them freely to compare perspectives on the same text.

---

## 🛠 Technical Features

- **Real-Time Streaming** — Responses appear token-by-token via Server-Sent Events (SSE) as the AI processes each question. No waiting for the full response.
- **Batch Question Processing** — Questions are sent to the LLM in groups of 5 with controlled pacing to stay within token limits and ensure consistent output quality.
- **File Processing** — Supports PDF (via `pdf-parse`), Microsoft Word (via `mammoth`), and plain text uploads with automatic text extraction.
- **Large Text Chunking** — Texts over 1,000 words are automatically detected and split into selectable chunks so you control exactly what gets analysed.
- **Dialogue System** — Post-analysis conversation mode lets you interrogate the results, raise concerns, or request a full regeneration with your feedback incorporated.
- **Drag & Drop Input** — Drop files directly onto the text input area for instant extraction.
- **Download Reports** — Export the completed analysis as a text report at any time.
- **Graceful Degradation** — Each AI provider fails independently with a clear in-stream error message, so one unavailable engine never blocks the others.

---

## 📋 Scoring Methodology

Scores represent an **outperformance percentile** — a score of `72/100` means the author outperforms 72 out of 100 people in the reference population on that dimension. The system is calibrated to distinguish genuine intellectual output from pseudo-intellectual or performative text.

---

## 🔑 Required Secrets

Set these in the **Secrets** tab. At least one AI provider key is required for analysis to function.

- `OPENAI_API_KEY` — Powers ZHI 1 (GPT). Required for OpenAI-based analysis.
- `ANTHROPIC_API_KEY` — Powers ZHI 2 (Claude). Required for Anthropic-based analysis.
- `DEEPSEEK_API_KEY` — Powers ZHI 3. Required for DeepSeek-based analysis.
- `PERPLEXITY_API_KEY` — Powers ZHI 4. Required for Perplexity-based analysis.
- `DATABASE_URL` — PostgreSQL connection string. Auto-provisioned by Replit.
- `SESSION_SECRET` — Signed-session cookie secret. Auto-provisioned by Replit.

---

## 🗄 Data & Storage

- **Database** — PostgreSQL via [Neon](https://neon.tech) serverless, managed with [Drizzle ORM](https://orm.drizzle.team).
- **Analysis History** — Every completed analysis is stored and retrievable by ID for the duration of the session.
- **Dialogue History** — Full conversation threads are persisted per analysis session.
- **No accounts required** — The app is fully functional without login. All analyses run anonymously.

---

## 🏗 Architecture

```
client/            React + TypeScript (Vite)
  pages/           home, not-found
  components/      AnalysisSelector, InputSection, ControlPanel,
                   RealTimeResults, DialogueSystem, ChunkSelector
  hooks/           useAnalysis — streaming + dialogue state

server/            Express + TypeScript
  routes.ts        All API endpoints
  storage.ts       IStorage interface + PostgreSQL implementation
  services/
    llmService.ts        ZHI 1–4 abstraction (stream + send)
    analysisEngine.ts    Question sets, batch processing, SSE orchestration
    fileProcessor.ts     PDF, Word, and text extraction + validation

shared/
  schema.ts        Drizzle schema + Zod types
  textUtils.ts     TextChunkingService
```

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server (http://localhost:5000)
npm run dev
```

**Production build:**

```bash
npm run build      # Vite frontend + esbuild server bundle → dist/
node dist/index.js # Start production server
```

---

## 🎯 Designed For

- **Researchers** evaluating written samples at scale
- **Clinicians** seeking a structured first-pass profile before deeper assessment
- **Educators** assessing the cognitive complexity of student writing
- **Analysts** comparing reasoning quality across multiple texts or authors
- **Investigators** identifying psychopathological markers in written communication

---

> **Disclaimer:** Mind Reader is a passthrough profiling tool intended for professional assessment purposes. Outputs are AI-generated and should be interpreted by qualified practitioners. They do not constitute a clinical diagnosis.
