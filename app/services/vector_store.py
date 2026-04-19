"""
Vector Store — FAISS-powered semantic search for document chunks.

Why FAISS (Facebook AI Similarity Search)?
- Industry standard for vector similarity search (used at Meta, Google, Spotify)
- Optimized C++ core = blazing fast even with millions of vectors
- Supports multiple index types: FlatIP (exact), IVF (approximate), HNSW (graph-based)
- We use IndexFlatIP (Inner Product) for exact cosine similarity on normalized vectors

How it works:
1. Documents are chunked into ~500-char pieces
2. Each chunk is embedded into a 384-dim vector using sentence-transformers
3. Vectors are L2-normalized so Inner Product = Cosine Similarity
4. On query: embed the query → search FAISS index → return top-k most similar chunks

NOTE: Heavy dependencies (sentence-transformers, faiss, numpy) are lazy-loaded
to stay under Render's 512MB free-tier memory limit at startup.
"""

import importlib

# FAISS index (Inner Product on L2-normalized vectors = Cosine Similarity)
EMBEDDING_DIM = 384

# Document text storage (maps FAISS index position → original text)
documents: list[str] = []

# --- Lazy-loaded heavy objects ---
# These are loaded ONLY when someone actually uploads or searches,
# not at app startup, so the server can boot under 512MB RAM.
_model = None
_index = None
_np = None
_faiss = None


def _get_np():
    """Lazy-load numpy."""
    global _np
    if _np is None:
        _np = importlib.import_module("numpy")
    return _np


def _get_faiss():
    """Lazy-load FAISS."""
    global _faiss
    if _faiss is None:
        _faiss = importlib.import_module("faiss")
    return _faiss


def _get_model():
    """Lazy-load the sentence-transformers embedding model (~80MB).
    
    all-MiniLM-L6-v2 is the gold standard for lightweight, high-quality embeddings.
    Only loaded on first use (upload or search), not at app boot.
    """
    global _model
    if _model is None:
        print("[FAISS] Loading embedding model (first use)...")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("[FAISS] Model loaded successfully!")
    return _model


def _get_index():
    """Lazy-load the FAISS index."""
    global _index
    if _index is None:
        faiss = _get_faiss()
        _index = faiss.IndexFlatIP(EMBEDDING_DIM)
    return _index


def add_document_chunks(chunks: list[str]):
    """Embed document chunks and add them to the FAISS index.
    
    Steps:
    1. Encode chunks into 384-dim vectors using sentence-transformers
    2. L2-normalize vectors (so inner product = cosine similarity)
    3. Add to FAISS index for fast retrieval
    4. Store original text for later retrieval
    """
    if not chunks:
        return

    np = _get_np()
    faiss = _get_faiss()
    model = _get_model()
    index = _get_index()

    # Encode text chunks into dense vectors
    embeddings = model.encode(chunks, convert_to_numpy=True)

    # L2-normalize so that inner product = cosine similarity
    faiss.normalize_L2(embeddings)

    # Add vectors to the FAISS index
    index.add(embeddings.astype(np.float32))

    # Store the original text (FAISS only stores vectors, not text)
    documents.extend(chunks)

    print(f"[FAISS] Added {len(chunks)} chunks. Total documents: {len(documents)}, Index size: {index.ntotal}")


def semantic_search(query: str, top_k: int = 3) -> list[str]:
    """Search for the most semantically similar document chunks.
    
    Returns a list of the top-k most relevant text chunks.
    """
    # Skip loading heavy ML libs if there's nothing to search
    if not documents:
        return []

    index = _get_index()
    if index.ntotal == 0:
        return []

    np = _get_np()
    faiss = _get_faiss()
    model = _get_model()

    # Embed the query
    query_embedding = model.encode([query], convert_to_numpy=True)
    faiss.normalize_L2(query_embedding)

    # Search FAISS index (returns distances and indices)
    scores, indices = index.search(query_embedding.astype(np.float32), min(top_k, index.ntotal))

    # Return matching documents (filter out invalid indices)
    results = []
    for i, idx in enumerate(indices[0]):
        if idx >= 0 and idx < len(documents):
            results.append(documents[idx])

    return results


def semantic_search_with_scores(query: str, top_k: int = 3) -> list[dict]:
    """Search with relevance scores for source attribution.
    
    Returns list of dicts with 'text' and 'score' keys.
    Used to show users WHERE the AI's answer came from.
    """
    # Skip loading heavy ML libs if there's nothing to search
    if not documents:
        return []

    index = _get_index()
    if index.ntotal == 0:
        return []

    np = _get_np()
    faiss = _get_faiss()
    model = _get_model()

    query_embedding = model.encode([query], convert_to_numpy=True)
    faiss.normalize_L2(query_embedding)

    scores, indices = index.search(query_embedding.astype(np.float32), min(top_k, index.ntotal))

    results = []
    for i, idx in enumerate(indices[0]):
        if idx >= 0 and idx < len(documents):
            results.append({
                "text": documents[idx],
                "score": round(float(scores[0][i]), 4)
            })

    return results


def get_index_stats() -> dict:
    """Return stats about the current vector store state."""
    index = _get_index()
    return {
        "total_documents": len(documents),
        "index_size": index.ntotal,
        "embedding_dim": EMBEDDING_DIM
    }
