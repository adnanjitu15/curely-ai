<div align="center">

# 🩺 Curely AI — Medical RAG Chatbot

### AI-Powered Medical Assistant with Document Understanding

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![FAISS](https://img.shields.io/badge/FAISS-Vector_DB-blueviolet?style=for-the-badge)](https://github.com/facebookresearch/faiss)
[![Python](https://img.shields.io/badge/Python_3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

**Curely AI** is a production-grade medical chatbot that uses **Retrieval-Augmented Generation (RAG)** to analyze medical reports, lab results, and health documents with clinical precision. Upload a blood report image, and get an instant, structured analysis with actionable health advice — complete with source attribution.

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **RAG Pipeline** | Upload documents → OCR extraction → FAISS vector embeddings → semantic search → context-injected AI responses |
| 📄 **Multi-Format Upload** | PDFs, images (JPG/PNG), and Word documents (DOCX) with automatic text extraction |
| 🔬 **Medical Report Analysis** | Parses lab values (HbA1C, cholesterol, etc.) with ✅/⚠️/🚨 status indicators and actionable advice |
| 🎤 **Voice Input** | Google-style voice overlay using SpeechRecognition API with auto-transcription |
| 📝 **Markdown Rendering** | AI responses rendered with rich formatting (headers, tables, bold, lists) |
| 📌 **Source Attribution** | Shows which document chunks informed the AI's response with relevance scores |
| 🎨 **Premium UI** | Animated landing page, CSS loader, Framer Motion transitions, toast notifications |
| ✏️ **Chat Actions** | Copy, edit, and delete messages with hover-reveal action buttons |

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Frontend — Next.js 16"
        A[Landing Page + CSS Loader] --> B[Chat Window]
        B --> C[Text Input]
        B --> D[Voice Input — SpeechRecognition API]
        B --> E[File Upload — PDF/Image/DOCX]
    end

    subgraph "Backend — FastAPI"
        F["/chat endpoint"] --> G{FAISS Semantic Search}
        G -->|Has context| H[RAG Response + Sources]
        G -->|No context| I[General Medical Chat]
        J["/upload endpoint"] --> K[Text Extraction + OCR]
        K --> L[Chunking + Embedding]
        L --> M[FAISS Vector Index]
    end

    subgraph "AI & ML"
        N[Gemini 2.5 Flash — Chat + Analysis]
        O[Gemini Vision — Image OCR]
        P[sentence-transformers — Embeddings]
    end

    C & D --> F
    E --> J
    H & I --> N
    K --> O
    L --> P
    M --> G
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16, React, TypeScript | Server-side rendered UI |
| **Animations** | Framer Motion | Page transitions, micro-interactions |
| **Styling** | Tailwind CSS v4 | Utility-first responsive design |
| **Markdown** | react-markdown + remark-gfm | Rich AI response rendering |
| **Backend** | FastAPI, Uvicorn, Pydantic | Async REST API with validation |
| **LLM** | Google Gemini 2.5 Flash | Medical chat + report analysis |
| **OCR** | Gemini Vision API + pytesseract | Dual-strategy text extraction from images |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2) | 384-dim text embeddings |
| **Vector DB** | FAISS (Facebook AI Similarity Search) | Cosine similarity search over document chunks |
| **Document Processing** | PyPDF, PyMuPDF, python-docx, Pillow | Multi-format document support |

---

## 📁 Project Structure

```
medical-rag/
├── app/                          # Backend (FastAPI)
│   ├── main.py                   # API endpoints (/chat, /upload, /health)
│   ├── core/
│   │   └── schemas.py            # Pydantic models (ChatRequest, ChatResponse, SourceChunk)
│   └── services/
│       ├── chat_service.py       # Gemini API integration + system prompts
│       ├── pdf_service.py        # PDF/Image/DOCX text extraction + OCR
│       └── vector_store.py       # FAISS vector index + semantic search
├── medical-frontend/             # Frontend (Next.js)
│   ├── app/
│   │   ├── page.tsx              # Main application (chat, voice, uploads)
│   │   ├── layout.tsx            # Root layout with metadata
│   │   ├── globals.css           # Tailwind config + CSS loader animations
│   │   └── components/
│   │       ├── Navbar.tsx         # Navigation bar
│   │       └── MewowBot.tsx      # Bot avatar component
│   └── package.json
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variable template
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Gemini API Key](https://aistudio.google.com/apikey)

### 1. Clone & Setup Backend
```bash
git clone https://github.com/YOUR_USERNAME/medical-rag.git
cd medical-rag

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 2. Start Backend
```bash
uvicorn app.main:app --reload
# API running at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 3. Start Frontend
```bash
cd medical-frontend
npm install
npm run dev
# Frontend running at http://localhost:3000
```

---

## 🔬 How the RAG Pipeline Works

1. **Upload** — User uploads a medical report (PDF/image/DOCX)
2. **Extract** — `pdf_service.py` extracts text via PyPDF or Gemini Vision OCR
3. **Chunk** — Text is split into ~500-character overlapping chunks
4. **Embed** — Each chunk is converted to a 384-dim vector using `all-MiniLM-L6-v2`
5. **Index** — Vectors are L2-normalized and added to a FAISS `IndexFlatIP` index
6. **Query** — User asks a question → query is embedded → FAISS finds top-k similar chunks
7. **Augment** — Relevant chunks are injected into the Gemini prompt as `[Document Context]`
8. **Generate** — Gemini 2.5 Flash generates a context-aware, clinically precise response
9. **Attribute** — Source chunks with relevance scores are shown below the response

---

## 📡 API Documentation

### `POST /chat`
Send a message and get an AI response with optional source attribution.

```json
// Request
{ "message": "What does my HbA1C level mean?" }

// Response
{
  "reply": "Your HbA1C of 9.6% indicates uncontrolled diabetes...",
  "sources": [
    { "text": "HbA1C: 9.6% Normal: <5.7...", "score": 0.8742 }
  ]
}
```

### `POST /upload`
Upload a document for RAG processing.

```json
// Response
{
  "filename": "blood_report.jpg",
  "characters_extracted": 1247,
  "chunks_created": 4,
  "preview": "IBN SINA DIAGNOSTIC CENTER..."
}
```

### `GET /health`
Health check endpoint.

---

## 🔮 Future Improvements

- [ ] Chat history persistence with SQLite/PostgreSQL
- [ ] Docker containerization for easy deployment
- [ ] OpenAI API as switchable LLM provider
- [ ] LangChain integration for advanced RAG chains
- [ ] User authentication with Google OAuth
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Dark mode toggle

---

## 📄 License

This project is built for educational and portfolio purposes.

---

<div align="center">
  <b>Built with ❤️ for AI Engineering</b>
</div>
