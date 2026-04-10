# --- ORIGINAL CODE (Backed up for safety) ---
# EMERGENCY_KEYWORDS = [
#     "snake bite", "bitten by snake", "heavy bleeding",
#     "unconscious", "seizure", "heart attack", "stroke",
#     "severe chest pain", "difficulty breathing",
#     "drowning", "choking", "severe burns",
# ]
# 
# MEDICAL_KEYWORDS = [
#     "health", "medical", "medicine", "doctor", "hospital",
#     "treatment", "diagnosis", "symptom",
#     "cut", "knife", "bleeding", "burn", "injury",
#     "pain", "fever", "vomit", "vomiting", "rash",
#     "infection", "swelling", "cough", "cold", "flu",
#     "skin", "scar", "pimple", "acne",
#     "weight", "fat", "diet", "exercise",
# ]
# 
# def is_emergency(message: str) -> bool:
#     return any(word in message for word in EMERGENCY_KEYWORDS)
# 
# def is_medical_query(message: str) -> bool:
#     return any(word in message for word in MEDICAL_KEYWORDS)
# 
# def generate_chat_reply(message: str) -> str:
#     msg = message.lower()
# 
#     if is_emergency(msg):
#         return (
#             "⚠️ This may be a medical emergency. "
#             "Please seek immediate medical help or go to the nearest hospital."
#         )
# 
#     if not is_medical_query(msg):
#         return (
#             "I’m designed to help with health, medical, and hygiene-related concerns. "
#             "Please clarify your health issue."
#         )
# 
#     return (
#         f"I understand your concern: '{message}'. "
#         "This information is educational only and not a medical diagnosis. "
#         "Please consult a qualified doctor for proper treatment."
#     )
# --------------------------------------------

import os
from pydantic import BaseModel
import google.genai as genai
import openai
from google.genai import types

EMERGENCY_KEYWORDS = [
    "snake bite", "bitten by snake", "heavy bleeding",
    "unconscious", "seizure", "heart attack", "stroke",
    "severe chest pain", "difficulty breathing",
    "drowning", "choking", "severe burns",
]

# Adding polite greetings and empathetic keywords
GREETING_KEYWORDS = ["salam", "assalamualaikum", "hello", "hi", "hey", "good morning", "good evening", "assalamu", "salam", "hi curely"]
EMPATHY_KEYWORDS = ["sick", "pain", "hurt", "unwell", "ill", "not feeling well", "fever", "cough"]

# Creator / identity questions — handled locally to avoid LLM safety filter crashes
CREATOR_KEYWORDS = [
    "who created you", "who made you", "who built you", "who developed you",
    "who is your creator", "who is your maker", "who is your developer",
    "who designed you", "who programmed you", "who coded you",
    "who are you", "what are you", "tell me about yourself",
    "who owns you", "who is behind you", "who is your owner",
    "your creator", "your developer", "your maker",
    "who invented you", "who founded you",
]

MEDICAL_KEYWORDS = [
    "health", "medical", "medicine", "doctor", "hospital",
    "treatment", "diagnosis", "symptom",
    "cut", "knife", "bleeding", "burn", "injury",
    "pain", "fever", "vomit", "vomiting", "rash",
    "infection", "swelling", "cough", "cold", "flu",
    "skin", "scar", "pimple", "acne",
    "weight", "fat", "diet", "exercise",
]

def is_emergency(message: str) -> bool:
    return any(word in message for word in EMERGENCY_KEYWORDS)

def is_medical_query(message: str) -> bool:
    return any(word in message for word in MEDICAL_KEYWORDS)

def is_greeting(message: str) -> bool:
    return any(word in message for word in GREETING_KEYWORDS)

def needs_empathy(message: str) -> bool:
    return any(word in message for word in EMPATHY_KEYWORDS)

def is_creator_question(message: str) -> bool:
    return any(phrase in message for phrase in CREATOR_KEYWORDS)

def generate_chat_reply(message: str, provider: str = "gemini") -> str:
    msg = message.lower()

    # 0. Handle creator/identity questions LOCALLY (Gemini's safety filter blocks these)
    if is_creator_question(msg):
        return (
            "Great question! 😊 I was created by **Adnan** — a passionate AI Engineer from Bangladesh 🇧🇩. "
            "He built me from scratch using a **RAG (Retrieval-Augmented Generation)** architecture with:\n\n"
            "- 🐍 **Python & FastAPI** for the backend\n"
            "- 🔍 **FAISS** (Facebook AI Similarity Search) for semantic vector search\n"
            "- 🤖 **Google Gemini 2.5 Flash** as my primary AI brain\n"
            "- 🧠 **OpenAI GPT-4o** as my backup brain\n"
            "- ⚛️ **Next.js** for the frontend\n"
            "- 🗄️ **SQLAlchemy + SQLite** for chat history\n\n"
            "I'm designed to help you understand your medical reports and answer health-related questions "
            "with real source attribution. Pretty cool, right? ✨\n\n"
            "Check out the project on [GitHub](https://github.com/adnanjitu15/curely-ai)! 🚀"
        )

    # 1. Check for real Gemini integration first
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)

            # Check if message contains medical report analysis context
            is_report_analysis = any(keyword in msg for keyword in ["report", "pdf", "lab", "test", "result", "glucose", "cholesterol", "triglyceride", "uploaded"])
            
            if is_report_analysis:
                # Specialized prompt for medical report analysis
                system_prompt = (
                    "You are **Curely AI**, a highly knowledgeable medical analyst and health advisor. "
                    "Your task is to analyze medical reports, lab results, and health documents with clinical precision and empathy.\n\n"
                    "## Your Analysis Approach for Medical Reports:\n"
                    "1. **Parse Each Result** - Go through each test result systematically\n"
                    "2. **Explain Clearly** - For EACH value:\n"
                    "   - State the actual result\n"
                    "   - Show the normal range\n"
                    "   - Use emojis: ✅ for normal, ⚠️ for concerning, 🚨 for critical\n"
                    "3. **Real Interpretation** - Tell them EXACTLY what it means, not generic disclaimers\n"
                    "4. **Actionable Advice** - Give specific, practical steps:\n"
                    "   - Diet changes (specific foods to avoid/eat)\n"
                    "   - Lifestyle modifications\n"
                    "   - When to see a doctor\n"
                    "   - Supplements or medications to discuss\n"
                    "5. **Risk Summary** - List potential health risks based on findings\n\n"
                    "## Critical Guidelines:\n"
                    "- BE GENUINELY HELPFUL. Don't hide behind 'consult a doctor' — give real information first.\n"
                    "- Use markdown formatting with headers, bullet points, and clear structure\n"
                    "- For normal values: briefly confirm they're OK\n"
                    "- For abnormal values: explain cause, risk, and concrete actions\n"
                    "- If critical (e.g., very high triglycerides, low glucose): emphasize urgency\n"
                    "- Include a brief disclaimer ONLY at the very end\n\n"
                    "## Response Format:\n"
                    "Use clear markdown with:\n"
                    "- Headers for each section\n"
                    "- Emojis for status indicators\n"
                    "- Bullet points for actionable steps\n"
                    "- Bold for important terms\n\n"
                    "Tone: Warm, professional, and genuinely helpful — like a caring nurse with medical expertise.\n"
                )
            else:
                # General medical advice prompt
                system_prompt = (
                    "You are **Curely AI**, a knowledgeable, warm, and genuinely helpful medical & health assistant. "
                    "Your purpose is to ACTUALLY HELP users with health questions — not to deflect them.\n\n"
                    "## Your Core Behavior:\n"
                    "- **Be genuinely useful.** When someone asks about symptoms, conditions, medications, or health tips, "
                    "give them real, detailed, actionable information.\n"
                    "- **Explain clearly.** Use simple language but be thorough. Break complex concepts into understandable parts.\n"
                    "- **Give practical health tips.** Diet suggestions, home remedies, hygiene tips, exercise advice — be comprehensive.\n"
                    "- **Be empathetic and warm.** Show genuine care and concern before providing information.\n"
                    "- **For emergencies** (chest pain, severe bleeding, seizures, etc.), urgently advise emergency services.\n\n"
                    "## What NOT to do:\n"
                    "- Don't say 'I can't provide medical advice' — that's unhelpful.\n"
                    "- Don't be overly cautious to the point of being useless.\n"
                    "- Don't repeat generic disclaimers.\n\n"
                    "Tone: Friendly, knowledgeable, warm — like a health-savvy caring friend. Keep responses practical and direct.\n"
                )

            if provider == "openai":
                openai_api_key = os.getenv("OPENAI_API_KEY")
                if openai_api_key:
                    try:
                        openai_client = openai.OpenAI(api_key=openai_api_key)
                        response = openai_client.chat.completions.create(
                            model="gpt-4o",
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": message}
                            ]
                        )
                        return response.choices[0].message.content
                    except Exception as e:
                        print(f"[WARNING] OpenAI API failed, falling back to Gemini: {e}")
                else:
                    print("[WARNING] OpenAI requested but OPENAI_API_KEY missing. Falling back to Gemini.")

            # Default / Fallback to Gemini
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=f"{system_prompt}\n\nUser's message: {message}"
            )
            return response.text
        except Exception as e:
            print(f"[CRITICAL] Gemini API Error in generate_chat_reply: {e}")
            # Fallback to local logic if API fails
            return f"I'm having a temporary issue connecting to my brain. Please try again in a moment! 🔄 (Error: {type(e).__name__})"

    # 2. Local Fallback Logic (Empathetic & Polite)
    
    # Handle Emergencies
    if is_emergency(msg):
        return (
            "⚠️ This sounds like a medical emergency. "
            "Please seek immediate medical help or go to your nearest emergency room right away."
        )

    # Handle Greetings (e.g. Salam, Hi)
    if is_greeting(msg) and not is_medical_query(msg) and not needs_empathy(msg):
        if "salam" in msg or "assalamu" in msg:
            return "Walaikum Assalam! 🌸 Welcome to Curely AI. How can I help you with your health today?"
        return "Hello there! 😊 I am Curely AI. How can I assist you with your health today?"

    # Handle Empathy for illnesses without strict medical questions
    if needs_empathy(msg) and not is_medical_query(msg):
        return (
            "I'm so sorry to hear that you're not feeling well. 🥺 Sending you wishes for a speedy recovery! "
            "Could you tell me a little bit more about your symptoms so I can help?"
        )

    # Handle non-medical strict block
    if not is_medical_query(msg) and not needs_empathy(msg) and not is_greeting(msg):
        return (
            "I am Curely AI, your health assistant! I'm designed specifically to help with health, medical, and hygiene-related concerns. "
            "Could you clarify your medical question for me? 😊"
        )

    # Standard Medical Response
    return (
        f"I completely understand your concern regarding your health. "
        "Based on what you shared, this information is educational only and not a medical diagnosis. "
        "Please make sure to consult a qualified doctor for proper medical treatment. Wishing you the best of health! 💖"
    )

def generate_chat_reply_with_context(message: str, context: str, provider: str = "gemini") -> str:
    """Generate a reply using specific document context via RAG."""
    msg = message.lower()
    
    # 0. Handle creator/identity questions LOCALLY (Gemini's safety filter blocks these)
    if is_creator_question(msg):
        return (
            "Great question! 😊 I was created by **Adnan** — a passionate AI Engineer from Bangladesh 🇧🇩. "
            "He built me from scratch using a **RAG (Retrieval-Augmented Generation)** architecture with:\n\n"
            "- 🐍 **Python & FastAPI** for the backend\n"
            "- 🔍 **FAISS** (Facebook AI Similarity Search) for semantic vector search\n"
            "- 🤖 **Google Gemini 2.5 Flash** as my primary AI brain\n"
            "- 🧠 **OpenAI GPT-4o** as my backup brain\n"
            "- ⚛️ **Next.js** for the frontend\n"
            "- 🗄️ **SQLAlchemy + SQLite** for chat history\n\n"
            "I'm designed to help you understand your medical reports and answer health-related questions "
            "with real source attribution. Pretty cool, right? ✨\n\n"
            "Check out the project on [GitHub](https://github.com/adnanjitu15/curely-ai)! 🚀"
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)

            system_prompt = (
                "You are **Curely AI**, a highly knowledgeable medical analyst and health advisor. "
                "The user has uploaded documents to their knowledge base. You must answer their queries using your medical expertise, and heavily prioritize the provided Document Context if it is relevant to their question.\n\n"
                "## Your Approach:\n"
                "1. **Contextual Awareness** - If the user asks 'What do I do?' or refers to their report, immediately analyze the provided context.\n"
                "2. **Parse Each Result** - If analyzing a lab result, state the actual result, the normal range, and use emojis (✅, ⚠️, 🚨).\n"
                "3. **Actionable Advice** - Give specific, practical steps (diet changes, lifestyle, when to see a doctor).\n"
                "4. **General Health** - If their query is NOT explicitly about the document, still provide excellent general medical advice, but factor in any relevant health history from the context.\n\n"
                "## Critical Guidelines:\n"
                "- Do NOT simply deflect and say you can't find it. If the context doesn't have the explicit answer, use your vast medical reasoning to give them the best possible advice.\n"
                "- Use markdown formatting (headers, bullet points, bold text).\n"
                "- Include a brief medical disclaimer ONLY at the very end.\n\n"
                "Tone: Warm, professional, and genuinely helpful — like a caring nurse with medical expertise."
            )

            prompt = f"{system_prompt}\n\n[Document Context]: {context}\n\nUser query: {message}"

            if provider == "openai":
                openai_api_key = os.getenv("OPENAI_API_KEY")
                if openai_api_key:
                    try:
                        openai_client = openai.OpenAI(api_key=openai_api_key)
                        response = openai_client.chat.completions.create(
                            model="gpt-4o",
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": f"[Document Context]: {context}\n\nUser query: {message}"}
                            ]
                        )
                        return response.choices[0].message.content
                    except Exception as e:
                        print(f"[WARNING] OpenAI API failed in context chat, falling back to Gemini: {e}")
                else:
                    print("[WARNING] OpenAI requested but OPENAI_API_KEY missing. Falling back to Gemini.")

            # Default / Fallback to Gemini
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return response.text
        except Exception as e:
            print(f"[CRITICAL] Gemini API Error with context: {e}")
            return f"I'm having a temporary issue analyzing your document. Please try again in a moment! 🔄 (Error: {type(e).__name__})"
            
    # Fallback to standard chat if API fails or no key
    return generate_chat_reply(message, provider=provider)
