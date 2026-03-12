import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

documents = []
embeddings = []

def add_document_chunks(chunks: list[str]):
    global documents, embeddings
    new_embeddings = model.encode(chunks)
    documents.extend(chunks)
    embeddings.extend(new_embeddings)

def semantic_search(query: str, top_k=3):
    if not documents:
        return []

    query_embedding = model.encode([query])[0]

    scores = np.dot(embeddings, query_embedding)
    top_indices = np.argsort(scores)[::-1][:top_k]

    return [documents[i] for i in top_indices]
