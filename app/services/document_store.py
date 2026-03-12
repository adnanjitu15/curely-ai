from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer("all-MiniLM-L6-v2")

DOCUMENTS = []
EMBEDDINGS = []

def add_document(text: str):
    DOCUMENTS.append(text)
    embedding = model.encode(text)
    EMBEDDINGS.append(embedding)

def search_documents(query: str, top_k: int = 1):
    if not DOCUMENTS:
        return []

    query_embedding = model.encode(query)

    similarities = cosine_similarity(
        [query_embedding],
        EMBEDDINGS
    )[0]

    ranked = sorted(
        zip(DOCUMENTS, similarities),
        key=lambda x: x[1],
        reverse=True
    )

    return [doc for doc, _ in ranked[:top_k]]
