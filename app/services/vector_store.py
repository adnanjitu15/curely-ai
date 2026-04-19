"""
Vector Store — Cloud-based semantic search for document chunks.

Architecture:
    - Embeddings: Google Gemini text-embedding-004 (API-based, zero local memory)
    - Search: Pure-Python cosine similarity (no FAISS needed for our scale)

Why this approach?
    - sentence-transformers + PyTorch needs ~800MB RAM → OOM on Render free tier
    - Gemini embeddings are FREE (up to 1,500 requests/day) and higher quality
    - For <10,000 chunks, pure-Python cosine similarity is fast enough (~5ms)

How it works:
    1. Documents are chunked into ~500-char pieces
    2. Each chunk is embedded into a 768-dim vector via Gemini API
    3. Vectors are stored in a simple Python list
    4. On query: embed the query → compute cosine similarity → return top-k
"""

import os
import math

# --- In-memory storage ---
documents: list[str] = []
embeddings: list[list[float]] = []

# Embedding dimension for text-embedding-004
EMBEDDING_DIM = 768


def _get_gemini_embedding(texts: list[str]) -> list[list[float]]:
    """Get embeddings from Google Gemini API.
    
    Uses text-embedding-004 model (free tier: 1,500 requests/day).
    Each request can batch up to 100 texts.
    """
    from google import genai
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[VECTOR] Warning: No GEMINI_API_KEY found, skipping embedding")
        return []
    
    client = genai.Client(api_key=api_key)
    
    all_embeddings = []
    # Process in batches of 20 to avoid API limits
    batch_size = 20
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            result = client.models.embed_content(
                model="text-embedding-004",
                contents=batch
            )
            for embedding in result.embeddings:
                all_embeddings.append(embedding.values)
        except Exception as e:
            print(f"[VECTOR] Embedding API error: {e}")
            # Return zero vectors as fallback
            for _ in batch:
                all_embeddings.append([0.0] * EMBEDDING_DIM)
    
    return all_embeddings


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors using pure Python.
    
    cosine_sim = (A · B) / (||A|| * ||B||)
    """
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    magnitude_a = math.sqrt(sum(a * a for a in vec_a))
    magnitude_b = math.sqrt(sum(b * b for b in vec_b))
    
    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0
    
    return dot_product / (magnitude_a * magnitude_b)


def add_document_chunks(chunks: list[str]):
    """Embed document chunks and add them to the in-memory store.
    
    Steps:
    1. Send chunks to Gemini embedding API
    2. Store vectors + original text in memory
    """
    if not chunks:
        return

    print(f"[VECTOR] Embedding {len(chunks)} chunks via Gemini API...")
    chunk_embeddings = _get_gemini_embedding(chunks)
    
    if not chunk_embeddings:
        print("[VECTOR] Warning: Failed to get embeddings")
        return
    
    # Store embeddings and documents
    embeddings.extend(chunk_embeddings)
    documents.extend(chunks)
    
    print(f"[VECTOR] Added {len(chunks)} chunks. Total documents: {len(documents)}")


def semantic_search(query: str, top_k: int = 3) -> list[str]:
    """Search for the most semantically similar document chunks.
    
    Returns a list of the top-k most relevant text chunks.
    """
    if not documents:
        return []

    # Get query embedding
    query_embeddings = _get_gemini_embedding([query])
    if not query_embeddings:
        return []
    
    query_vec = query_embeddings[0]
    
    # Compute similarity with all stored embeddings
    scores = []
    for i, doc_vec in enumerate(embeddings):
        sim = _cosine_similarity(query_vec, doc_vec)
        scores.append((sim, i))
    
    # Sort by similarity (highest first) and take top-k
    scores.sort(reverse=True, key=lambda x: x[0])
    
    results = []
    for score, idx in scores[:top_k]:
        if idx < len(documents):
            results.append(documents[idx])
    
    return results


def semantic_search_with_scores(query: str, top_k: int = 3) -> list[dict]:
    """Search with relevance scores for source attribution.
    
    Returns list of dicts with 'text' and 'score' keys.
    Used to show users WHERE the AI's answer came from.
    """
    if not documents:
        return []

    # Get query embedding
    query_embeddings = _get_gemini_embedding([query])
    if not query_embeddings:
        return []
    
    query_vec = query_embeddings[0]
    
    # Compute similarity with all stored embeddings
    scores = []
    for i, doc_vec in enumerate(embeddings):
        sim = _cosine_similarity(query_vec, doc_vec)
        scores.append((sim, i))
    
    # Sort by similarity (highest first) and take top-k
    scores.sort(reverse=True, key=lambda x: x[0])
    
    results = []
    for score, idx in scores[:top_k]:
        if idx < len(documents):
            results.append({
                "text": documents[idx],
                "score": round(score, 4)
            })
    
    return results


def get_index_stats() -> dict:
    """Return stats about the current vector store state."""
    return {
        "total_documents": len(documents),
        "index_size": len(embeddings),
        "embedding_dim": EMBEDDING_DIM
    }
