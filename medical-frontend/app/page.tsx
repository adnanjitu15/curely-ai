"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import MewowBot from "./components/MewowBot";
import { Facebook, Twitter, MessageCircle, Send, Paperclip, Mic, MoreVertical, Sparkles, Search, Copy, Edit3, Trash2, FileText } from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- ANIMATION VARIANTS ---
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

// --- GLOW BUTTON COMPONENT (SOCIALS) ---
const SocialButton = ({ icon: Icon, href, color, isTikTok = false, isInsta = false }: any) => {
  return (
    <motion.a
      href={href}
      variants={fadeInUp}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.9 }}
      style={{ "--btn-color": color } as React.CSSProperties}
      className={`
        group relative flex items-center justify-center w-14 h-14 
        bg-white rounded-full shadow-lg transition-all duration-300 ease-out
        hover:shadow-[0_0_25px_5px_var(--btn-color)]
      `}
    >
      <div className={`absolute inset-0 rounded-full opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out ${isInsta ? "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]" : "bg-[var(--btn-color)]"}`} />
      <div className="relative z-10 text-slate-500 transition-colors duration-300 group-hover:text-white">
        {isTikTok ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" /></svg>
        ) : isInsta ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
        ) : (
          <Icon size={22} />
        )}
      </div>
    </motion.a>
  );
};

// --- HEALTHCARE FACTS FOR PLACEHOLDER (NOW 10 FACTS!) ---
const HEALTH_FACTS = [
  "What are the early signs of dehydration?",
  "How does sleep optimize the immune system?",
  "What is the biological code of aging?",
  "Best daily habits for skin health?",
  "How to balance circadian rhythms naturally?",
  "Can gut health affect mental clarity?",
  "What are the benefits of intermittent fasting?",
  "How does stress physically alter the brain?",
  "What is the role of Vitamin D in bone density?",
  "How to lower resting heart rate naturally?"
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [isBooked, setIsBooked] = useState(false);
  const [isChatSent, setIsChatSent] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Input Box States
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [factIndex, setFactIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // --- ORIGINAL CODE (Backed up for safety) ---
  // // NEW: Ref for the chat capsule to detect outside clicks
  // const capsuleRef = useRef<HTMLDivElement>(null);
  //
  // useEffect(() => {
  //   setMounted(true);
  // }, []);
  // --------------------------------------------

  // NEW: Ref for the chat capsule to detect outside clicks
  const capsuleRef = useRef<HTMLDivElement>(null);

  // Chat State
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string; sources?: any[] }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // File Upload State - MUST DECLARE THESE!
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ========== ORIGINAL CODE (BEFORE FIX) ==========
  // const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; size: number } | null>(null);
  // This only stored metadata, not the actual file. Bad for upload later.
  // ========== END ORIGINAL CODE ==========

  // ========== NEW CODE (FIXED FIX) ==========
  // Now we store the actual File object + metadata so we can upload it when user clicks send
  const [attachedFile, setAttachedFile] = useState<{ file: File; name: string; type: string; size: number } | null>(null);
  // ========== END NEW CODE ==========

  // ========== NEW UI STATE FOR UX IMPROVEMENTS ==========
  // Toast notifications for upload success/error (instead of chat bubble)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; show: boolean }>({ 
    message: '', 
    type: 'success', 
    show: false 
  });
  
  // "Reading documents" status during bot processing
  const [isReadingDocuments, setIsReadingDocuments] = useState(false);
  
  // ========== NEW: VOICE UI STATE ==========
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // ========== END NEW VOICE UI STATE ==========
  // ========== END NEW UI STATE ==========

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cycle through facts every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % HEALTH_FACTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // NEW: Click Outside Logic Hook
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If we click OUTSIDE the capsule AND the input is empty, reset it!
      if (capsuleRef.current && !capsuleRef.current.contains(event.target as Node)) {
        if (chatInput.trim() === "") {
          setIsChatMode(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [chatInput]);

  // ========== NEW: SPEECH RECOGNITION LOGIC ==========
  useEffect(() => {
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        
        // Update the live transcript
        setTranscript(currentTranscript);

        // Reset the silence timer every time we get a new transcription result
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
        }, 5000); // 5 seconds of silence
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        stopListening();
      };
      
      recognitionRef.current.onend = () => {
        // Automatically handled by stopListening
      };
    }
    
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      setToast({ message: "❌ Voice input is not supported in this browser.", type: 'error', show: true });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
      return;
    }
    setTranscript("");
    setIsListening(true);
    recognitionRef.current.start();
    
    // Initial silence timer (if they click it but don't say anything)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
    }, 5000);
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    // Only populate if we actually heard something
    setTranscript(prev => {
      if (prev.trim()) {
        setChatInput(prev.trim());
      }
      return "";
    });
  };
  // ========== END SPEECH LOGIC ==========

  // Handle Message Actions
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: "✅ Copying to clipboard was successful!", type: 'success', show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const handleEdit = (index: number, content: string) => {
    setChatInput(content);
    // Removed slicing of messages array to prevent deleting the history
    inputRef.current?.focus();
  };

  const handleDelete = (index: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      // If user deletes their own message, also delete the AI's immediate reply
      if (newMessages[index].role === 'user' && newMessages[index + 1]?.role === 'ai') {
        newMessages.splice(index, 2);
      } else {
        newMessages.splice(index, 1);
      }
      return newMessages;
    });
  };

  // YOUR ORIGINAL TIMINGS AND BUTTON LOGIC
  const handleChatClick = () => {
    if (isChatSent) return;

    // 1. Trigger the GOATed button animation
    setIsChatSent(true);

    // 2. Wait 7 seconds (Allows "Chat with AI" text to fully animate)
    setTimeout(() => {
      setShowRefresh(true);

      // 3. Show loader for 6 seconds, then switch to full Chat Window
      setTimeout(() => {
        setShowRefresh(false);
        setShowChatWindow(true);
      }, 6000); // 6 seconds wait time for loader
    }, 7000); // 7 seconds wait time for button animation
  };

  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop the box from turning into a chat box
    const query = encodeURIComponent(HEALTH_FACTS[factIndex]);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  const activateChatMode = () => {
    setIsChatMode(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // --- ORIGINAL CODE (Backed up for safety) ---
  // // Keep this in case user tabs away, but the outside click handles the rest now!
  // const handleBlur = () => {
  //   if (chatInput.trim() === "") {
  //     setIsChatMode(false);
  //   }
  // };
  //
  // if (!mounted) return null;
  // --------------------------------------------

  // Keep this in case user tabs away, but the outside click handles the rest now!
  const handleBlur = () => {
    if (chatInput.trim() === "") {
      setIsChatMode(false);
    }
  };

  // ========== ORIGINAL CODE (BEFORE FIX) ==========
  // const handleSendMessage = async () => {
  //   if (attachedFile && fileInputRef.current?.files?.[0]) {
  //     // ... was checking fileInputRef.current?.files?.[0] which may not exist if user just picked file
  //   }
  // };
  // Problem: It tried to read from fileInputRef.current?.files after file picker closed,
  // and the message wasn't being preserved properly.
  // ========== END ORIGINAL CODE ==========

  // ========== NEW CODE (FIXED FIX) ==========
  // Now we use the attachedFile state (which has the actual File object) instead of trying to read fileInputRef
  const handleSendMessage = async () => {
    // If there's an attached file, upload it first
    if (attachedFile) {
      const file = attachedFile.file;  // ← Use the File from state, not from input
      const messageText = chatInput.trim(); // Capture message text BEFORE clearing anything
      setIsUploading(true);
      
      // Track whether upload succeeded
      let uploadSucceeded = false;
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          uploadSucceeded = true;  // ← Mark upload as successful
          
          // ========== ORIGINAL CODE (BEFORE FIX) ==========
          // setMessages(prev => [...prev, { 
          //   role: 'ai', 
          //   content: `✅ Document uploaded successfully!\n\n📄 ${file.name}\n📊 ${data.characters_extracted} characters extracted\n🧩 ${data.chunks_created} knowledge chunks created\n\nYou can now ask me questions about this document! 🧠` 
          // }]);
          // Problem: Upload success shown as chat message, cluttered chat history
          // ========== END ORIGINAL CODE ==========
          
          // ========== NEW CODE (FIXED FIX) ==========
          // Show upload success as toast notification instead of chat message
          setToast({
            message: `✅ ${file.name} uploaded! ${data.characters_extracted} chars, ${data.chunks_created} chunks`,
            type: 'success',
            show: true
          });
          // Auto-dismiss toast after 5 seconds
          setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
          // ========== END NEW CODE ==========
        } else {
          // ========== UX IMPROVEMENT: Error as toast ==========
          setToast({
            message: `❌ Upload failed: ${data.detail || 'Unknown error'}`,
            type: 'error',
            show: true
          });
          setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
          // ========== END ==========
        }
      } catch (err) {
        // ========== UX IMPROVEMENT: Connection error as toast ==========
        setToast({
          message: '❌ Could not connect to the server',
          type: 'error',
          show: true
        });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
        // ========== END ==========
      } finally {
        setAttachedFile(null);  
        setIsUploading(false);
        inputRef.current?.focus();
      }
      
      // ========== NEW CODE: Only send message if upload succeeded ==========
      // If upload failed or errored, don't send the message
      // User can try again after fixing the upload issue
      if (uploadSucceeded && messageText) {
        setChatInput("");
        setMessages(prev => [...prev, { role: "user", content: messageText }]);
        setIsLoading(true);
        
        // ========== NEW: Show "Reading documents" status during processing ==========
        setIsReadingDocuments(true);
        // ========== END NEW ==========
        
        try {
          const response = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: messageText }),
          });

          if (!response.ok) {
            throw new Error("Failed to send message");
          }

          const chatData = await response.json();
          setMessages(prev => [...prev, { role: "ai", content: chatData.reply, sources: chatData.sources || [] }]);
        } catch (error) {
          console.error("Chat error:", error);
          setMessages(prev => [...prev, { role: "ai", content: "Sorry, I'm having trouble connecting to the server. Please try again." }]);
        } finally {
          setIsLoading(false);
          // ========== NEW: Hide "Reading documents" when done ==========
          setIsReadingDocuments(false);
          // ========== END NEW ==========
        }
      } else if (!uploadSucceeded && messageText) {
        // Upload failed - show message that user should fix upload first
        setChatInput(messageText);  // ← Keep message in input so user can retry
      }
      return;
    }

    // Otherwise, send text message
    if (!chatInput.trim() || isLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "ai", content: data.reply, sources: data.sources || [] }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I'm having trouble connecting to the server. Please try again." }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };
  // ========== END NEW CODE ==========

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen bg-[#E3EBF3] flex flex-col overflow-hidden font-sans">

      {/* Background Pulse */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_#FFFFFF_5%,_transparent_50%)] opacity-60"
      />

      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-center px-12 pt-32">

        {/* LEFT SIDE CONTENT */}
        <motion.div className="relative z-10 space-y-8" variants={staggerContainer} initial="hidden" animate="visible">

          <motion.div variants={fadeInUp} className="w-fit bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-md px-5 py-2 rounded-full border border-blue-500/20 text-[11px] font-black text-blue-600 tracking-[0.2em] uppercase shadow-sm">
            🚀 The Future Is Here!
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-7xl lg:text-[90px] font-medium text-slate-900 tracking-tighter leading-[0.9]">
            The Engine for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900">Next-Gen Healthcare</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-slate-500 text-lg max-w-lg leading-relaxed">
            {/* --- ORIGINAL: Go beyond simple search— Transform static documents into an interactive knowledge base. Ask questions in plain language and get clear, context-aware answers. --- */}
            Go beyond simple search— Transform static documents into an interactive knowledge base. Ask questions in plain language and get clear, context-aware answers directly from your medical reports, powered by advanced Reasoning AI.
          </motion.p>

          {/* --- BUTTONS ROW --- */}
          <div className="flex items-center gap-5 pt-4 h-24">

            {/* 1. APPOINTMENT BUTTON */}
            <motion.button
              layout
              onClick={() => setIsBooked(!isBooked)}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="group relative overflow-hidden bg-black text-white rounded-full px-8 py-4 font-bold shadow-xl hover:shadow-2xl active:scale-95 transition-shadow h-[64px] flex items-center justify-center min-w-[160px]"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />

              <AnimatePresence mode="popLayout" initial={false}>
                {isBooked ? (
                  <motion.span key="booked" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 whitespace-nowrap">
                    📞 Book a Call
                  </motion.span>
                ) : (
                  <motion.span key="initial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 whitespace-nowrap">
                    Appointment
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* 2. ✨ BUTTON 5: CHAT BUTTON ✨ (YOUR ORIGINAL CODE) */}
            <button
              className={`btn-5 ${isChatSent ? 'sent-active' : ''}`}
              onClick={handleChatClick}
            >
              <div className="outline"></div>

              <div className="state state--default">
                <div className="icon">
                  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g style={{ filter: 'url(#shadow)' }}>
                      <path d="M14.2199 21.63C13.0399 21.63 11.3699 20.8 10.0499 16.83L9.32988 14.67L7.16988 13.95C3.20988 12.63 2.37988 10.96 2.37988 9.78001C2.37988 8.61001 3.20988 6.93001 7.16988 5.60001L15.6599 2.77001C17.7799 2.06001 19.5499 2.27001 20.6399 3.35001C21.7299 4.43001 21.9399 6.21001 21.2299 8.33001L18.3999 16.82C17.0699 20.8 15.3999 21.63 14.2199 21.63ZM7.63988 7.03001C4.85988 7.96001 3.86988 9.06001 3.86988 9.78001C3.86988 10.5 4.85988 11.6 7.63988 12.52L10.1599 13.36C10.3799 13.43 10.5599 13.61 10.6299 13.83L11.4699 16.35C12.3899 19.13 13.4999 20.12 14.2199 20.12C14.9399 20.12 16.0399 19.13 16.9699 16.35L19.7999 7.86001C20.3099 6.32001 20.2199 5.06001 19.5699 4.41001C18.9199 3.76001 17.6599 3.68001 16.1299 4.19001L7.63988 7.03001Z" fill="currentColor"></path>
                      <path d="M10.11 14.4C9.92005 14.4 9.73005 14.33 9.58005 14.18C9.29005 13.89 9.29005 13.41 9.58005 13.12L13.16 9.53C13.45 9.24 13.93 9.24 14.22 9.53C14.51 9.82 14.51 10.3 14.22 10.59L10.64 14.18C10.5 14.33 10.3 14.4 10.11 14.4Z" fill="currentColor"></path>
                    </g>
                    <defs>
                      <filter id="shadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodOpacity="0.5"></feDropShadow>
                      </filter>
                    </defs>
                  </svg>
                </div>
                <p>
                  {"Chat".split("").map((char, i) => (
                    <span key={i} style={{ "--i": i } as React.CSSProperties}>{char}</span>
                  ))}
                </p>
              </div>

              <div className="state state--sent">
                <div className="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="1em" width="1em" strokeWidth="0.5px" stroke="black">
                    <g style={{ filter: 'url(#shadow)' }}>
                      <path fill="currentColor" d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z"></path>
                      <path fill="currentColor" d="M10.5795 15.5801C10.3795 15.5801 10.1895 15.5001 10.0495 15.3601L7.21945 12.5301C6.92945 12.2401 6.92945 11.7601 7.21945 11.4701C7.50945 11.1801 7.98945 11.1801 8.27945 11.4701L10.5795 13.7701L15.7195 8.6301C16.0095 8.3401 16.4895 8.3401 16.7795 8.6301C17.0695 8.9201 17.0695 9.4001 16.7795 9.6901L11.1095 15.3601C10.9695 15.5001 10.7795 15.5801 10.5795 15.5801Z"></path>
                    </g>
                  </svg>
                </div>
                <p>
                  {"Chat with AI ✨".split("").map((char, i) => (
                    <span key={i} style={{ "--i": i + 5 } as React.CSSProperties}>{char === " " ? "\u00A0" : char}</span>
                  ))}
                </p>
              </div>
            </button>

          </div>

          {/* SOCIAL ICONS */}
          <motion.div variants={fadeInUp} className="relative z-50 flex items-center gap-5 pt-8">
            <SocialButton icon={Facebook} href="#" color="#1877F2" />
            <SocialButton icon={Twitter} href="#" color="#1DA1F2" />
            <SocialButton icon={null} isInsta={true} href="#" color="#bc1888" />
            <SocialButton icon={null} isTikTok={true} href="#" color="#000000" />
            <SocialButton icon={MessageCircle} href="#" color="#25D366" />
          </motion.div>
        </motion.div>

        {/* RIGHT SIDE: BOT ONLY */}
        <div className="relative z-20 flex justify-center items-center h-[850px] lg:-ml-40 overflow-visible w-full pointer-events-none">
          <MewowBot />
        </div>
      </div>

      {/* --- REFRESH LOADING WINDOW (THE ORIGINAL GOATED BELL LOADER) --- */}
      <AnimatePresence>
        {showRefresh && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="preloader" 
          >
            <div className="preloader-body">
              <div className="cssload-bell">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="cssload-circle">
                    <div className="cssload-inner"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="instructions">
              {/* --- ORIGINAL: <p>Loading your experience...</p> --- */}
              <p className="loader-tagline">Initializing Curely AI Intelligence...</p>
            </div>
            <div className="punchline-container">
              <p className="punchline-text">Your Health. Our Priority. Powered by AI.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FULL PAGE 2: NEW CURELY AI CHAT WINDOW --- */}
      <AnimatePresence>
        {showChatWindow && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }} className="fixed inset-0 z-[9999] bg-[#F9FBFC] flex font-sans">
                {/* Sidebar */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
                    <div className="p-6 flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200"><Sparkles size={20} fill="white"/></div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Curely AI</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 px-2">Recent Sessions</div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-blue-600 text-sm font-medium flex items-center gap-3">
                            <MessageCircle size={16} /> New Consultation
                        </div>
                    </div>
                    <div className="p-4"><button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all">+ Start New Chat</button></div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col relative bg-[#F9FBFC]">
                    {/* ========== NEW: TOAST NOTIFICATIONS ==========*/}
                    <AnimatePresence>
                      {toast.show && (
                        <motion.div
                          initial={{ opacity: 0, y: -20, x: "-50%" }}
                          animate={{ opacity: 1, y: 0, x: "-50%" }}
                          exit={{ opacity: 0, y: -20, x: "-50%" }}
                          className={`fixed top-8 left-1/2 z-50 px-5 py-3 rounded-lg font-medium text-sm shadow-xl flex items-center gap-3 border transition-all ${
                            toast.type === 'success'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <span>{toast.message}</span>
                          <button
                            onClick={() => setToast(prev => ({ ...prev, show: false }))}
                            className="ml-2 text-lg font-bold opacity-60 hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* ========== END NEW ==========*/}
                    
                    {/* Fixed Header: Transparent and Seamless! */}
                    <header className="h-20 bg-transparent flex items-center justify-between px-8 absolute top-0 w-full z-10 pointer-events-none">
                        <div className="flex items-center gap-3 pointer-events-auto">
                            <h3 className="font-bold text-slate-800 text-lg">Curely AI Assistant</h3>
                            <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-bold rounded-full uppercase">Secure</span>
                        </div>
                        <button onClick={() => setShowChatWindow(false)} className="p-3 hover:bg-slate-200/50 text-slate-400 hover:text-red-500 rounded-full transition-all pointer-events-auto">
                            ✕
                        </button>
                    </header>

                    {/* --- ORIGINAL CODE (Backed up for safety) ---
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pt-20">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="max-w-2xl space-y-6">
                            <div className="relative group">
                                <motion.div animate={{ y: [0, -10, 0], rotateX: [0, 5, 0], rotateY: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="cursor-default">
                                    <h1 className="text-5xl font-bold text-slate-900 leading-tight">Mastering the <span className="text-blue-600">Biological Code</span></h1>
                                    <p className="mt-6 text-xl text-slate-500 leading-relaxed font-light">
                                        Experience a new era of human longevity powered by <span className="font-semibold text-slate-800">Curely AI's</span> neural intelligence. We don't just treat; <span className="italic text-blue-500">we optimize🩺</span>
                                    </p>
                                </motion.div>
                                <div className="absolute -inset-10 bg-blue-400/5 blur-[100px] rounded-full -z-10 group-hover:bg-blue-400/10 transition-all duration-1000" />
                            </div>
                        </motion.div>
                    </div>
                    -------------------------------------------- */}

                    {/* Chat Messages Area / Voice Overlay Area */}
                    <div className={`flex-1 overflow-y-auto w-full relative pt-24 ${messages.length === 0 && !isListening ? 'flex flex-col items-center justify-center text-center p-6' : 'p-6'}`}>
                        {/* ========== NEW: VOICE OVERLAY ========== */}
                        <AnimatePresence>
                            {isListening && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-white/95 backdrop-blur-xl z-20 flex flex-col items-center justify-center rounded-2xl md:rounded-none overflow-hidden"
                                >
                                    <div className="flex flex-col items-center text-center space-y-12 max-w-2xl px-8 mt-[-100px]">
                                        <motion.h2 
                                            animate={{ opacity: [0.7, 1, 0.7] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="text-slate-800 text-4xl sm:text-5xl font-light tracking-wide"
                                        >
                                            {transcript ? "Listening..." : "Speak now"}
                                        </motion.h2>

                                        <div className="relative flex items-center justify-center">
                                            {/* Pulsing rings */}
                                            <motion.div 
                                                animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                                className="absolute w-24 h-24 bg-red-500 rounded-full"
                                            />
                                            <motion.div 
                                                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                                                className="absolute w-24 h-24 bg-red-500 rounded-full"
                                            />
                                            
                                            {/* Mic button */}
                                            <button 
                                                onClick={stopListening}
                                                className="relative z-10 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:scale-105 transition-transform"
                                            >
                                                <Mic size={40} className="text-red-500" strokeWidth={2.5} />
                                            </button>
                                        </div>

                                        <motion.p 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-slate-700 text-2xl sm:text-3xl font-medium min-h-[80px]"
                                        >
                                            {transcript}
                                        </motion.p>
                                    </div>
                                    <button 
                                        onClick={stopListening}
                                        className="absolute top-8 right-8 text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {/* ========== END VOICE OVERLAY ========== */}

                        <div className={`w-full h-full transition-opacity duration-500 flex flex-col ${isListening ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${messages.length === 0 ? 'items-center justify-center' : ''}`}>
                        {messages.length === 0 ? (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="max-w-2xl mx-auto space-y-6 text-center">
                                <div className="relative group">
                                    <motion.div animate={{ y: [0, -10, 0], rotateX: [0, 5, 0], rotateY: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="cursor-default">
                                        <h1 className="text-5xl font-bold text-slate-900 leading-tight">Mastering the <span className="text-blue-600">Biological Code</span></h1>
                                        <p className="mt-6 text-xl text-slate-500 leading-relaxed font-light">
                                            Experience a new era of human longevity powered by <span className="font-semibold text-slate-800">Curely AI's</span> neural intelligence. We don't just treat; <span className="italic text-blue-500">we optimize🩺</span>
                                        </p>
                                    </motion.div>
                                    <div className="absolute -inset-10 bg-blue-400/5 blur-[100px] rounded-full -z-10 group-hover:bg-blue-400/10 transition-all duration-1000" />
                                </div>
                            </motion.div>
                        ) : (
                            <div className="max-w-3xl mx-auto space-y-6 w-full">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-4 group ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                        {msg.role === 'ai' && (
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm"><Sparkles size={16} /></div>
                                        )}
                                        <div className={`space-y-1 max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-4 rounded-2xl shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none text-left' : 'bg-white border text-slate-700 border-slate-100 rounded-tl-none text-left'}`}>
                                                {msg.role === 'ai' ? (
                                                    <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-p:text-slate-700 prose-strong:text-slate-800 prose-li:text-slate-700 prose-a:text-blue-600 prose-hr:border-slate-200">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                            {/* Source Attribution Chips */}
                                            {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <span className="text-xs text-slate-400 flex items-center gap-1"><FileText size={12} /> Sources:</span>
                                                    {msg.sources.map((src: any, sIdx: number) => (
                                                        <span key={sIdx} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100 max-w-[250px] truncate" title={src.text}>
                                                            📄 {src.text.slice(0, 60)}... ({Math.round(src.score * 100)}%)
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Action bar shown on hover */}
                                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1 mx-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <button onClick={() => handleCopy(msg.content)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors tooltip" title="Copy">
                                                    <Copy size={16} strokeWidth={2.5} />
                                                </button>
                                                {msg.role === 'user' && (
                                                    <button onClick={() => handleEdit(idx, msg.content)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors tooltip" title="Edit">
                                                        <Edit3 size={16} strokeWidth={2.5} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors tooltip" title="Delete">
                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* ========== NEW: "READING DOCUMENTS" STATUS MESSAGE ==========*/}
                                {isReadingDocuments && (
                                  <div className="flex gap-4">
                                    <div className="w-10 h-10 flex-shrink-0"></div>
                                    <motion.div 
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="text-sm text-slate-500 py-2 px-4 rounded-lg bg-slate-50 italic"
                                    >
                                      📖 Reading documents...
                                    </motion.div>
                                  </div>
                                )}
                                {/* ========== END NEW ==========*/}
                                
                                {isLoading && (
                                    <div className="flex gap-4 max-w-3xl">
                                        <div className="w-10 h-10 flex-shrink-0"></div>
                                        <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex gap-2 items-center">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                    </div>

                    {/* ✨ THE MAGICAL INPUT AREA ✨ */}
                    <div className="p-8 pb-12 w-full flex justify-center bg-gradient-to-t from-white via-[#F9FBFC] to-transparent">
                        {/* THE REF IS PLACED RIGHT HERE 👇 */}
                        <div ref={capsuleRef} className="w-full max-w-3xl relative h-[70px]">
                            <AnimatePresence mode="wait">
                                {!isChatMode ? (
                                    /* GLOWING SEARCH BOX STATE */
                                    <motion.div
                                        key="search-mode"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                                        transition={{ duration: 0.2 }}
                                        onClick={activateChatMode}
                                        className="absolute inset-0 flex items-center justify-between bg-white rounded-full cursor-pointer px-6 animate-glow transition-all hover:scale-[1.02]"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden text-slate-500">
                                            <Sparkles size={20} className="text-blue-500 flex-shrink-0" />
                                            <AnimatePresence mode="wait">
                                                <motion.p 
                                                    key={factIndex}
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    exit={{ y: -20, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="font-medium whitespace-nowrap"
                                                >
                                                    {HEALTH_FACTS[factIndex]}
                                                </motion.p>
                                            </AnimatePresence>
                                        </div>
                                        {/* Magnefine Glass Button (Searches Google) */}
                                        <button 
                                            onClick={handleSearchClick}
                                            className="p-3 bg-slate-100 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Search size={20} />
                                        </button>
                                    </motion.div>
                                ) : (
                                    /* NORMAL CHAT BOX STATE */
                                    <motion.div
                                        key="chat-mode"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                        className="absolute inset-0 flex items-center gap-3 bg-white p-2 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-blue-100 focus-within:border-blue-300 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all"
                                    >
                                        {/* --- ORIGINAL: <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Paperclip size={20} /></button> --- */}
                                        {/* ========== ORIGINAL CODE (BEFORE FIX) ==========
                                            This used to instantly upload and show "📎 Uploading: file.pdf" as a chat message,
                                            which made it look like the user sent that text. WRONG! We store the file instead.
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setIsUploading(true);
                                                setMessages(prev => [...prev, { role: 'user', content: `📎 Uploading: ${file.name}` }]); // ❌ WRONG!
                                                try {
                                                    const formData = new FormData();
                                                    formData.append('file', file);
                                                    const res = await fetch('http://localhost:8000/upload', {
                                                        method: 'POST',
                                                        body: formData,
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        setMessages(prev => [...prev, { role: 'ai', content: `✅ Document uploaded successfully!...` }]);
                                                    } else {
                                                        setMessages(prev => [...prev, { role: 'ai', content: `❌ Upload failed: ...` }]);
                                                    }
                                                } catch (err) {
                                                    setMessages(prev => [...prev, { role: 'ai', content: '❌ Could not connect...' }]);
                                                } finally {
                                                    setIsUploading(false);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }
                                            }}
                                        />
                                        ========== END ORIGINAL CODE ========== */}

                                        {/* ========== NEW CODE (FIXED FIX) ==========
                                            Now we just store the file in `attachedFile` state and display it as a chip.
                                            User clicks send → then we upload. Much better UX!
                                        ========== */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                // Store the actual File object + metadata for LATER upload
                                                setAttachedFile({ file, name: file.name, type: file.type, size: file.size });
                                                // DON'T clear input yet — we need the file object!
                                                // DON'T upload yet — wait for user to click send
                                            }}
                                        />
                                        {/* ========== END NEW CODE ========== */}
                                        {/* ========== ORIGINAL CODE (BEFORE FIX) ==========
                                            <button
                                              onClick={() => fileInputRef.current?.click()}
                                              disabled={isUploading}
                                              className="p-3 text-slate-400 hover:text-blue-600 ..."
                                            >
                                            Problem: Only showed if uploading, no visual feedback for attached file.
                                        ========== END ORIGINAL CODE ==========
                                        */}

                                        {/* ========== NEW CODE (FIXED FIX) ==========
                                            Now with tooltip ("Add files and more") and improved visual feedback
                                        ========== */}
                                        <div className="relative group">
                                          <button
                                              onClick={() => fileInputRef.current?.click()}
                                              disabled={isUploading}
                                              className={`p-3 rounded-2xl transition-all relative ${
                                                attachedFile 
                                                  ? 'text-emerald-600 bg-emerald-50 cursor-not-allowed' 
                                                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                              } ${isUploading ? 'animate-pulse' : ''}`}
                                          >
                                              <Paperclip size={20} />
                                          </button>
                                          
                                          {/* Tooltip on hover */}
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs font-medium py-1.5 px-3 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                            Add files and more
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                                          </div>
                                        </div>
                                        {/* ========== END NEW CODE ========== */}
                                        {/* ========== ORIGINAL CODE (BEFORE FIX) ==========
                                            {attachedFile && (
                                              <motion.div>
                                                <span>{attachedFile.name}</span>
                                                ...
                                              </motion.div>
                                            )}
                                            Problem: This chip existed but the attachment state wasn't storing the File object,
                                            so it couldn't actually upload when user clicked send.
                                        ========== END ORIGINAL CODE ==========
                                        */}

                                        {/* ========== NEW CODE (FIXED FIX) ==========
                                            Now the attachment chip:
                                            1. Displays with X button to remove
                                            2. Shows spinner when isUploading=true
                                            3. Stores File object so we can upload it
                                        ========== */}
                                        {attachedFile && (
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`flex items-center gap-2 px-3 py-2 border border-emerald-200 rounded-full text-xs font-medium transition-all ${
                                              isUploading
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-emerald-50 text-emerald-700'
                                            }`}
                                          >
                                            <span>📎</span>
                                            
                                            {/* Spinner during upload */}
                                            {isUploading && (
                                              <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-700 rounded-full"
                                              />
                                            )}
                                            
                                            <span className="truncate max-w-[120px]">
                                              {isUploading ? 'Uploading...' : attachedFile.name}
                                            </span>
                                            
                                            {/* Remove button (disabled during upload) */}
                                            <button
                                              onClick={() => setAttachedFile(null)}
                                              disabled={isUploading}
                                              className="ml-1 text-emerald-600 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              ✕
                                            </button>
                                          </motion.div>
                                        )}
                                        {/* ========== END NEW CODE ========== */}
                                        {/* --- ORIGINAL CODE (Backed up for safety) ---
                                        <input 
                                            ref={inputRef}
                                            type="text" 
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onBlur={handleBlur}
                                            placeholder="Message Curely AI..." 
                                            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 px-2 font-medium text-lg" 
                                        />
                                        <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Mic size={20} /></button>
                                        <button className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"><Send size={20} /></button>
                                        -------------------------------------------- */}

                                        <input 
                                            ref={inputRef}
                                            type="text" 
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                            onBlur={handleBlur}
                                            placeholder="Message Curely AI..." 
                                            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 px-2 font-medium text-lg" 
                                        />
                                        <button 
                                            onClick={isListening ? stopListening : startListening}
                                            className={`p-3 rounded-2xl transition-all ${isListening ? 'text-red-500 bg-red-50 animate-pulse shadow-sm shadow-red-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                        >
                                            <Mic size={20} />
                                        </button>
                                        
                                        {/* ========== ORIGINAL CODE (BEFORE FIX) ==========
                                            <button onClick={handleSendMessage} disabled={isLoading} className="..." />
                                            Problem: Only checked isLoading. Didn't disable during file upload,
                                            so user could click send multiple times while uploading.
                                        ========== END ORIGINAL CODE ========== */}

                                        {/* ========== NEW CODE (FIXED FIX) ==========
                                            IMPORTANT: We DO NOT disable the button during upload anymore!
                                            Before (OLD): disabled={isLoading || isUploading}
                                            Now (NEW): Only disabled={isLoading}
                                            
                                            Why? To match ChatGPT UX: button stays enabled with visual feedback (opacity)
                                            so it doesn't look broken during upload. We use isUploading to show spinner
                                            in the attachment chip instead.
                                        ========== */}
                                        <button 
                                          onClick={handleSendMessage} 
                                          disabled={isLoading}
                                          className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                          <Send size={20} />
                                        </button>
                                        {/* ========== END NEW CODE ========== */}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        /* ✨ PUNCHLINE TEXT ANIMATION (below loader) */
        .punchline-container {
            margin-top: 20px;
            text-align: center;
        }
        .punchline-text {
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6);
            background-size: 300% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: punchline-shimmer 4s ease-in-out infinite;
        }
        .loader-tagline {
            font-size: 13px;
            color: #94a3b8;
            letter-spacing: 0.1em;
        }
        @keyframes punchline-shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* GLOW ANIMATION FOR THE SEARCH BOX (ADDED FROM NEW CODE) */
        @keyframes custom-glow {
            0%, 100% { box-shadow: 0 0 15px 2px rgba(59, 130, 246, 0.2), inset 0 0 0 1px rgba(59, 130, 246, 0.1); }
            50% { box-shadow: 0 0 25px 8px rgba(59, 130, 246, 0.4), inset 0 0 0 1px rgba(59, 130, 246, 0.2); }
        }
        .animate-glow {
            animation: custom-glow 3s infinite ease-in-out;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        /* Shine effect for Book a Call button */
        @keyframes shine { 
            0% { transform: translateX(-100%) skewX(-15deg); } 
            100% { transform: translateX(200%) skewX(-15deg); } 
        }

        /* --- ORIGINAL GOATED BELL LOADER CSS --- */
        .preloader {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #ffffff;
        }

        .preloader * {
            box-sizing: content-box;
        }

        .cssload-bell {
            width: 97px;
            height: 99px;
            border-radius: 100%;
            position: relative;
            animation: cssload-spin 5.75s linear infinite;
        }

        .cssload-circle {
            width: 100%;
            height: 100%;
            position: absolute;
        }

        .cssload-circle .cssload-inner {
            width: 100%;
            height: 100%;
            border-radius: 100%;
            border-bottom: 5px solid rgb(47, 49, 148);
            border-left: 5px solid rgb(47, 49, 148);
            border-right: none;
            border-top: none;
            box-shadow: rgb(109, 111, 204) 0px 0px 10px inset;
            animation: cssload-spin 2.3s linear infinite;
        }

        .cssload-circle:nth-of-type(1) { transform: rotate(0deg); }
        .cssload-circle:nth-of-type(2) { transform: rotate(70deg); }
        .cssload-circle:nth-of-type(3) { transform: rotate(140deg); }
        .cssload-circle:nth-of-type(4) { transform: rotate(210deg); }
        .cssload-circle:nth-of-type(5) { transform: rotate(280deg); }

        @keyframes cssload-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .instructions {
            position: absolute;
            bottom: 20px;
            text-align: center;
            color: #666;
        }

        /* --- BUTTON 5 CSS INTEGRATION --- */
        .btn-5 {
          --primary: #8f44fd;
          --radius: 32px;
          cursor: pointer;
          border-radius: var(--radius);
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.3s ease;
          min-width: 140px;
          width: fit-content;
          padding: 0 20px;
          height: 64px;
          font-family: inherit;
          font-size: 18px;
          font-weight: 600;
          background: #fff;
          color: #111; 
        }
        .btn-5:hover { transform: scale(1.02); }
        .btn-5:active { transform: scale(1); }
        .btn-5:after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: var(--radius);
          background: #fff;
          border: 2.5px solid transparent;
          z-index: 0;
          transition: all 0.4s ease;
        }
        .btn-5:hover::after { transform: scale(1.05, 1.1); }
        .btn-5::before {
          content: "";
          inset: 7px 6px 6px 6px;
          position: absolute;
          border-radius: 30px;
          filter: blur(0.5px);
          z-index: 2;
        }
        .btn-5 .state p {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
        }
        .btn-5 .state .icon {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          margin: auto;
          transform: scale(1.25);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-5 .state .icon svg { overflow: visible; }

        .btn-5 .outline {
          position: absolute;
          border-radius: inherit;
          overflow: hidden;
          z-index: 1;
          opacity: 0;
          transition: opacity 0.4s ease;
          inset: -2px -3.5px;
        }
        .btn-5 .outline::before {
          content: "";
          position: absolute;
          inset: -100%;
          background: conic-gradient(from 180deg, transparent 60%, white 80%, transparent 100%);
          animation: spin 2s linear infinite;
          animation-play-state: paused;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn-5:hover .outline { opacity: 1; }
        .btn-5:hover .outline::before { animation-play-state: running; }

        .btn-5 .state p span {
          display: block;
          opacity: 0;
          animation: slideDown 0.8s ease forwards calc(var(--i) * 0.03s);
        }
        .btn-5:hover p span {
          opacity: 1;
          animation: wave 0.5s ease forwards calc(var(--i) * 0.02s);
        }
        .btn-5.sent-active p span {
          opacity: 1;
          animation: disapear 0.6s ease forwards calc(var(--i) * 0.03s);
        }
        @keyframes wave {
          30% { opacity: 1; transform: translateY(4px) translateX(0) rotate(0); }
          50% { opacity: 1; transform: translateY(-3px) translateX(0) rotate(0); color: var(--primary); }
          100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
        }
        @keyframes slideDown {
          0% { opacity: 0; transform: translateY(-20px) translateX(5px) rotate(-90deg); color: var(--primary); filter: blur(5px); }
          30% { opacity: 1; transform: translateY(4px) translateX(0) rotate(0); filter: blur(0); }
          50% { opacity: 1; transform: translateY(-3px) translateX(0) rotate(0); }
          100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
        }
        @keyframes disapear {
          from { opacity: 1; }
          to { opacity: 0; transform: translateX(5px) translateY(20px); color: var(--primary); filter: blur(5px); }
        }

        .btn-5 .state--default .icon svg { animation: land 0.6s ease forwards; }
        .btn-5:hover .state--default .icon { transform: rotate(45deg) scale(1.25); }
        .btn-5.sent-active .state--default svg { animation: takeOff 0.8s linear forwards; }
        .btn-5.sent-active .state--default .icon { transform: rotate(0) scale(1.25); }
        @keyframes takeOff {
          0% { opacity: 1; }
          60% { opacity: 1; transform: translateX(70px) rotate(45deg) scale(2); }
          100% { opacity: 0; transform: translateX(160px) rotate(45deg) scale(0); }
        }
        @keyframes land {
          0% { transform: translateX(-60px) translateY(30px) rotate(-50deg) scale(2); opacity: 0; filter: blur(3px); }
          100% { transform: translateX(0) translateY(0) rotate(0); opacity: 1; filter: blur(0); }
        }

        .btn-5 .state--default .icon:before {
          content: "";
          position: absolute;
          top: 50%;
          height: 2px;
          width: 0;
          left: -5px;
          background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.5));
        }
        .btn-5.sent-active .state--default .icon:before { animation: contrail 0.8s linear forwards; }
        @keyframes contrail {
          0% { width: 0; opacity: 1; }
          8% { width: 15px; }
          60% { opacity: 0.7; width: 80px; }
          100% { opacity: 0; width: 160px; }
        }

        .btn-5 .state { padding-left: 29px; z-index: 2; display: flex; position: relative; }
        .btn-5 .state--sent { display: none; }
        .btn-5 .state--sent svg { transform: scale(1.25); margin-right: 8px; }
        .btn-5.sent-active .state--default { position: absolute; }
        .btn-5.sent-active .state--sent { display: flex; }
        .btn-5.sent-active .state--sent span {
          opacity: 0;
          animation: slideDown 0.8s ease forwards calc(var(--i) * 0.2s);
        }
        .btn-5.sent-active .state--sent .icon svg {
          opacity: 0;
          animation: appear 1.2s ease forwards 0.8s;
        }
        @keyframes appear {
          0% { opacity: 0; transform: scale(4) rotate(-40deg); color: var(--primary); filter: blur(4px); }
          30% { opacity: 1; transform: scale(0.6); filter: blur(1px); }
          50% { opacity: 1; transform: scale(1.2); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  );
}

//     // 2. Wait 7 seconds (Allows "Chat with AI" text to fully animate)
//     setTimeout(() => {
//       setShowRefresh(true);

//       // 3. Show loader for 6 seconds, then switch to full Chat Window
//       setTimeout(() => {
//         setShowRefresh(false);
//         setShowChatWindow(true);
//       }, 6000); // 6 seconds wait time for loader
//     }, 7000); // 7 seconds wait time for button animation
//   };

//   const handleSearchClick = (e: React.MouseEvent) => {
//     e.stopPropagation(); // Stop the box from turning into a chat box
//     const query = encodeURIComponent(HEALTH_FACTS[factIndex]);
//     window.open(`https://www.google.com/search?q=${query}`, '_blank');
//   };

//   const activateChatMode = () => {
//     setIsChatMode(true);
//     setTimeout(() => inputRef.current?.focus(), 100);
//   };

//   // If user clicks away and input is empty, revert to glowing search box
//   const handleBlur = () => {
//     if (chatInput.trim() === "") {
//       setIsChatMode(false);
//     }
//   };

//   if (!mounted) return null;

//   return (
//     <main className="relative min-h-screen bg-[#E3EBF3] flex flex-col overflow-hidden font-sans">

//       {/* Background Pulse */}
//       <motion.div
//         animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
//         transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_#FFFFFF_5%,_transparent_50%)] opacity-60"
//       />

//       <Navbar />

//       <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-center px-12 pt-32">

//         {/* LEFT SIDE CONTENT */}
//         <motion.div className="relative z-10 space-y-8" variants={staggerContainer} initial="hidden" animate="visible">

//           <motion.div variants={fadeInUp} className="w-fit bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-md px-5 py-2 rounded-full border border-blue-500/20 text-[11px] font-black text-blue-600 tracking-[0.2em] uppercase shadow-sm">
//             🚀 The Future Is Here!
//           </motion.div>

//           <motion.h1 variants={fadeInUp} className="text-7xl lg:text-[90px] font-medium text-slate-900 tracking-tighter leading-[0.9]">
//             The Engine for <br />
//             <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900">Next-Gen Healthcare</span>
//           </motion.h1>

//           <motion.p variants={fadeInUp} className="text-slate-500 text-lg max-w-lg leading-relaxed">
//             Go beyond simple search— Transform static documents into an interactive knowledge base. Ask questions in plain language and get clear, context-aware answers.
//           </motion.p>

//           {/* --- BUTTONS ROW --- */}
//           <div className="flex items-center gap-5 pt-4 h-24">

//             {/* 1. APPOINTMENT BUTTON */}
//             <motion.button
//               layout
//               onClick={() => setIsBooked(!isBooked)}
//               transition={{ type: "spring", stiffness: 400, damping: 25 }}
//               className="group relative overflow-hidden bg-black text-white rounded-full px-8 py-4 font-bold shadow-xl hover:shadow-2xl active:scale-95 transition-shadow h-[64px] flex items-center justify-center min-w-[160px]"
//             >
//               <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />

//               <AnimatePresence mode="popLayout" initial={false}>
//                 {isBooked ? (
//                   <motion.span key="booked" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 whitespace-nowrap">
//                     📞 Book a Call
//                   </motion.span>
//                 ) : (
//                   <motion.span key="initial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 whitespace-nowrap">
//                     Appointment
//                   </motion.span>
//                 )}
//               </AnimatePresence>
//             </motion.button>

//             {/* 2. ✨ BUTTON 5: CHAT BUTTON ✨ (YOUR ORIGINAL CODE) */}
//             <button
//               className={`btn-5 ${isChatSent ? 'sent-active' : ''}`}
//               onClick={handleChatClick}
//             >
//               <div className="outline"></div>

//               <div className="state state--default">
//                 <div className="icon">
//                   <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//                     <g style={{ filter: 'url(#shadow)' }}>
//                       <path d="M14.2199 21.63C13.0399 21.63 11.3699 20.8 10.0499 16.83L9.32988 14.67L7.16988 13.95C3.20988 12.63 2.37988 10.96 2.37988 9.78001C2.37988 8.61001 3.20988 6.93001 7.16988 5.60001L15.6599 2.77001C17.7799 2.06001 19.5499 2.27001 20.6399 3.35001C21.7299 4.43001 21.9399 6.21001 21.2299 8.33001L18.3999 16.82C17.0699 20.8 15.3999 21.63 14.2199 21.63ZM7.63988 7.03001C4.85988 7.96001 3.86988 9.06001 3.86988 9.78001C3.86988 10.5 4.85988 11.6 7.63988 12.52L10.1599 13.36C10.3799 13.43 10.5599 13.61 10.6299 13.83L11.4699 16.35C12.3899 19.13 13.4999 20.12 14.2199 20.12C14.9399 20.12 16.0399 19.13 16.9699 16.35L19.7999 7.86001C20.3099 6.32001 20.2199 5.06001 19.5699 4.41001C18.9199 3.76001 17.6599 3.68001 16.1299 4.19001L7.63988 7.03001Z" fill="currentColor"></path>
//                       <path d="M10.11 14.4C9.92005 14.4 9.73005 14.33 9.58005 14.18C9.29005 13.89 9.29005 13.41 9.58005 13.12L13.16 9.53C13.45 9.24 13.93 9.24 14.22 9.53C14.51 9.82 14.51 10.3 14.22 10.59L10.64 14.18C10.5 14.33 10.3 14.4 10.11 14.4Z" fill="currentColor"></path>
//                     </g>
//                     <defs>
//                       <filter id="shadow">
//                         <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodOpacity="0.5"></feDropShadow>
//                       </filter>
//                     </defs>
//                   </svg>
//                 </div>
//                 <p>
//                   {"Chat".split("").map((char, i) => (
//                     <span key={i} style={{ "--i": i } as React.CSSProperties}>{char}</span>
//                   ))}
//                 </p>
//               </div>

//               <div className="state state--sent">
//                 <div className="icon">
//                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="1em" width="1em" strokeWidth="0.5px" stroke="black">
//                     <g style={{ filter: 'url(#shadow)' }}>
//                       <path fill="currentColor" d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z"></path>
//                       <path fill="currentColor" d="M10.5795 15.5801C10.3795 15.5801 10.1895 15.5001 10.0495 15.3601L7.21945 12.5301C6.92945 12.2401 6.92945 11.7601 7.21945 11.4701C7.50945 11.1801 7.98945 11.1801 8.27945 11.4701L10.5795 13.7701L15.7195 8.6301C16.0095 8.3401 16.4895 8.3401 16.7795 8.6301C17.0695 8.9201 17.0695 9.4001 16.7795 9.6901L11.1095 15.3601C10.9695 15.5001 10.7795 15.5801 10.5795 15.5801Z"></path>
//                     </g>
//                   </svg>
//                 </div>
//                 <p>
//                   {"Chat with AI ✨".split("").map((char, i) => (
//                     <span key={i} style={{ "--i": i + 5 } as React.CSSProperties}>{char === " " ? "\u00A0" : char}</span>
//                   ))}
//                 </p>
//               </div>
//             </button>

//           </div>

//           {/* SOCIAL ICONS */}
//           <motion.div variants={fadeInUp} className="relative z-50 flex items-center gap-5 pt-8">
//             <SocialButton icon={Facebook} href="#" color="#1877F2" />
//             <SocialButton icon={Twitter} href="#" color="#1DA1F2" />
//             <SocialButton icon={null} isInsta={true} href="#" color="#bc1888" />
//             <SocialButton icon={null} isTikTok={true} href="#" color="#000000" />
//             <SocialButton icon={MessageCircle} href="#" color="#25D366" />
//           </motion.div>
//         </motion.div>

//         {/* RIGHT SIDE: BOT ONLY */}
//         <div className="relative z-20 flex justify-center items-center h-[850px] lg:-ml-40 overflow-visible w-full pointer-events-none">
//           <MewowBot />
//         </div>
//       </div>

//       {/* --- REFRESH LOADING WINDOW (THE ORIGINAL GOATED BELL LOADER) --- */}
//       <AnimatePresence>
//         {showRefresh && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             transition={{ duration: 0.5 }}
//             className="preloader" 
//           >
//             <div className="preloader-body">
//               <div className="cssload-bell">
//                 {[0, 1, 2, 3, 4].map((i) => (
//                   <div key={i} className="cssload-circle">
//                     <div className="cssload-inner"></div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//             <div className="instructions">
//               <p>Loading your experience...</p>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* --- FULL PAGE 2: NEW CURELY AI CHAT WINDOW --- */}
//       <AnimatePresence>
//         {showChatWindow && (
//             <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }} className="fixed inset-0 z-[9999] bg-[#F9FBFC] flex font-sans">
//                 {/* Sidebar */}
//                 <div className="w-80 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
//                     <div className="p-6 flex items-center gap-3">
//                         <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200"><Sparkles size={20} fill="white"/></div>
//                         <h2 className="text-2xl font-bold tracking-tight text-slate-800">Curely AI</h2>
//                     </div>
//                     <div className="flex-1 overflow-y-auto p-4 space-y-2">
//                         <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 px-2">Recent Sessions</div>
//                         <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-blue-600 text-sm font-medium flex items-center gap-3">
//                             <MessageCircle size={16} /> New Consultation
//                         </div>
//                     </div>
//                     <div className="p-4"><button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all">+ Start New Chat</button></div>
//                 </div>

//                 {/* Main Chat Area */}
//                 <div className="flex-1 flex flex-col relative bg-[#F9FBFC]">
//                     {/* Fixed Header: Transparent and Seamless! */}
//                     <header className="h-20 bg-transparent flex items-center justify-between px-8 absolute top-0 w-full z-10 pointer-events-none">
//                         <div className="flex items-center gap-3 pointer-events-auto">
//                             <h3 className="font-bold text-slate-800 text-lg">Curely AI Assistant</h3>
//                             <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-bold rounded-full uppercase">Secure</span>
//                         </div>
//                         <button onClick={() => setShowChatWindow(false)} className="p-3 hover:bg-slate-200/50 text-slate-400 hover:text-red-500 rounded-full transition-all pointer-events-auto">
//                             ✕
//                         </button>
//                     </header>

//                     {/* Chat Messages Area */}
//                     <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pt-20">
//                         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="max-w-2xl space-y-6">
//                             <div className="relative group">
//                                 <motion.div animate={{ y: [0, -10, 0], rotateX: [0, 5, 0], rotateY: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="cursor-default">
//                                     <h1 className="text-5xl font-bold text-slate-900 leading-tight">Mastering the <span className="text-blue-600">Biological Code</span></h1>
//                                     <p className="mt-6 text-xl text-slate-500 leading-relaxed font-light">
//                                         Experience a new era of human longevity powered by <span className="font-semibold text-slate-800">Curely AI's</span> neural intelligence. We don't just treat; <span className="italic text-blue-500">we optimize🩺</span>
//                                     </p>
//                                 </motion.div>
//                                 <div className="absolute -inset-10 bg-blue-400/5 blur-[100px] rounded-full -z-10 group-hover:bg-blue-400/10 transition-all duration-1000" />
//                             </div>
//                         </motion.div>
//                     </div>

//                     {/* ✨ THE MAGICAL INPUT AREA ✨ */}
//                     <div className="p-8 pb-12 w-full flex justify-center bg-gradient-to-t from-white via-[#F9FBFC] to-transparent">
//                         <div className="w-full max-w-3xl relative h-[70px]">
//                             <AnimatePresence mode="wait">
//                                 {!isChatMode ? (
//                                     /* GLOWING SEARCH BOX STATE */
//                                     <motion.div
//                                         key="search-mode"
//                                         initial={{ opacity: 0, scale: 0.95 }}
//                                         animate={{ opacity: 1, scale: 1 }}
//                                         exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
//                                         transition={{ duration: 0.2 }}
//                                         onClick={activateChatMode}
//                                         className="absolute inset-0 flex items-center justify-between bg-white rounded-full cursor-pointer px-6 animate-glow transition-all hover:scale-[1.02]"
//                                     >
//                                         <div className="flex items-center gap-3 overflow-hidden text-slate-500">
//                                             <Sparkles size={20} className="text-blue-500 flex-shrink-0" />
//                                             <AnimatePresence mode="wait">
//                                                 <motion.p 
//                                                     key={factIndex}
//                                                     initial={{ y: 20, opacity: 0 }}
//                                                     animate={{ y: 0, opacity: 1 }}
//                                                     exit={{ y: -20, opacity: 0 }}
//                                                     transition={{ duration: 0.3 }}
//                                                     className="font-medium whitespace-nowrap"
//                                                 >
//                                                     {HEALTH_FACTS[factIndex]}
//                                                 </motion.p>
//                                             </AnimatePresence>
//                                         </div>
//                                         {/* Magnefine Glass Button (Searches Google) */}
//                                         <button 
//                                             onClick={handleSearchClick}
//                                             className="p-3 bg-slate-100 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm"
//                                         >
//                                             <Search size={20} />
//                                         </button>
//                                     </motion.div>
//                                 ) : (
//                                     /* NORMAL CHAT BOX STATE */
//                                     <motion.div
//                                         key="chat-mode"
//                                         initial={{ opacity: 0, y: 20 }}
//                                         animate={{ opacity: 1, y: 0 }}
//                                         transition={{ duration: 0.2, ease: "easeOut" }}
//                                         className="absolute inset-0 flex items-center gap-3 bg-white p-2 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-blue-100 focus-within:border-blue-300 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all"
//                                     >
//                                         <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Paperclip size={20} /></button>
//                                         <input 
//                                             ref={inputRef}
//                                             type="text" 
//                                             value={chatInput}
//                                             onChange={(e) => setChatInput(e.target.value)}
//                                             onBlur={handleBlur}
//                                             placeholder="Message Curely AI..." 
//                                             className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 px-2 font-medium text-lg" 
//                                         />
//                                         <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Mic size={20} /></button>
//                                         <button className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"><Send size={20} /></button>
//                                     </motion.div>
//                                 )}
//                             </AnimatePresence>
//                         </div>
//                     </div>
//                 </div>
//             </motion.div>
//         )}
//       </AnimatePresence>

//       <style jsx global>{`
//         /* GLOW ANIMATION FOR THE SEARCH BOX (ADDED FROM NEW CODE) */
//         @keyframes custom-glow {
//             0%, 100% { box-shadow: 0 0 15px 2px rgba(59, 130, 246, 0.2), inset 0 0 0 1px rgba(59, 130, 246, 0.1); }
//             50% { box-shadow: 0 0 25px 8px rgba(59, 130, 246, 0.4), inset 0 0 0 1px rgba(59, 130, 246, 0.2); }
//         }
//         .animate-glow {
//             animation: custom-glow 3s infinite ease-in-out;
//             border: 1px solid rgba(59, 130, 246, 0.3);
//         }

//         /* Shine effect for Book a Call button */
//         @keyframes shine { 
//             0% { transform: translateX(-100%) skewX(-15deg); } 
//             100% { transform: translateX(200%) skewX(-15deg); } 
//         }

//         /* --- ORIGINAL GOATED BELL LOADER CSS --- */
//         .preloader {
//             position: fixed;
//             inset: 0;
//             z-index: 10000;
//             display: flex;
//             flex-direction: column;
//             justify-content: center;
//             align-items: center;
//             background: #ffffff;
//         }

//         .preloader * {
//             box-sizing: content-box;
//         }

//         .cssload-bell {
//             width: 97px;
//             height: 99px;
//             border-radius: 100%;
//             position: relative;
//             animation: cssload-spin 5.75s linear infinite;
//         }

//         .cssload-circle {
//             width: 100%;
//             height: 100%;
//             position: absolute;
//         }

//         .cssload-circle .cssload-inner {
//             width: 100%;
//             height: 100%;
//             border-radius: 100%;
//             border-bottom: 5px solid rgb(47, 49, 148);
//             border-left: 5px solid rgb(47, 49, 148);
//             border-right: none;
//             border-top: none;
//             box-shadow: rgb(109, 111, 204) 0px 0px 10px inset;
//             animation: cssload-spin 2.3s linear infinite;
//         }

//         .cssload-circle:nth-of-type(1) { transform: rotate(0deg); }
//         .cssload-circle:nth-of-type(2) { transform: rotate(70deg); }
//         .cssload-circle:nth-of-type(3) { transform: rotate(140deg); }
//         .cssload-circle:nth-of-type(4) { transform: rotate(210deg); }
//         .cssload-circle:nth-of-type(5) { transform: rotate(280deg); }

//         @keyframes cssload-spin {
//             0% { transform: rotate(0deg); }
//             100% { transform: rotate(360deg); }
//         }

//         .instructions {
//             position: absolute;
//             bottom: 20px;
//             text-align: center;
//             color: #666;
//         }

//         /* --- BUTTON 5 CSS INTEGRATION --- */
//         .btn-5 {
//           --primary: #8f44fd;
//           --radius: 32px;
//           cursor: pointer;
//           border-radius: var(--radius);
//           text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
//           border: none;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           position: relative;
//           transition: all 0.3s ease;
//           min-width: 140px;
//           width: fit-content;
//           padding: 0 20px;
//           height: 64px;
//           font-family: inherit;
//           font-size: 18px;
//           font-weight: 600;
//           background: #fff;
//           color: #111; 
//         }
//         .btn-5:hover { transform: scale(1.02); }
//         .btn-5:active { transform: scale(1); }
//         .btn-5:after {
//           content: "";
//           position: absolute;
//           inset: 0;
//           border-radius: var(--radius);
//           background: #fff;
//           border: 2.5px solid transparent;
//           z-index: 0;
//           transition: all 0.4s ease;
//         }
//         .btn-5:hover::after { transform: scale(1.05, 1.1); }
//         .btn-5::before {
//           content: "";
//           inset: 7px 6px 6px 6px;
//           position: absolute;
//           border-radius: 30px;
//           filter: blur(0.5px);
//           z-index: 2;
//         }
//         .btn-5 .state p {
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           margin: 0;
//         }
//         .btn-5 .state .icon {
//           position: absolute;
//           left: 0;
//           top: 0;
//           bottom: 0;
//           margin: auto;
//           transform: scale(1.25);
//           transition: all 0.3s ease;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//         }
//         .btn-5 .state .icon svg { overflow: visible; }

//         .btn-5 .outline {
//           position: absolute;
//           border-radius: inherit;
//           overflow: hidden;
//           z-index: 1;
//           opacity: 0;
//           transition: opacity 0.4s ease;
//           inset: -2px -3.5px;
//         }
//         .btn-5 .outline::before {
//           content: "";
//           position: absolute;
//           inset: -100%;
//           background: conic-gradient(from 180deg, transparent 60%, white 80%, transparent 100%);
//           animation: spin 2s linear infinite;
//           animation-play-state: paused;
//         }
//         @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
//         .btn-5:hover .outline { opacity: 1; }
//         .btn-5:hover .outline::before { animation-play-state: running; }

//         .btn-5 .state p span {
//           display: block;
//           opacity: 0;
//           animation: slideDown 0.8s ease forwards calc(var(--i) * 0.03s);
//         }
//         .btn-5:hover p span {
//           opacity: 1;
//           animation: wave 0.5s ease forwards calc(var(--i) * 0.02s);
//         }
//         .btn-5.sent-active p span {
//           opacity: 1;
//           animation: disapear 0.6s ease forwards calc(var(--i) * 0.03s);
//         }
//         @keyframes wave {
//           30% { opacity: 1; transform: translateY(4px) translateX(0) rotate(0); }
//           50% { opacity: 1; transform: translateY(-3px) translateX(0) rotate(0); color: var(--primary); }
//           100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
//         }
//         @keyframes slideDown {
//           0% { opacity: 0; transform: translateY(-20px) translateX(5px) rotate(-90deg); color: var(--primary); filter: blur(5px); }
//           30% { opacity: 1; transform: translateY(4px) translateX(0) rotate(0); filter: blur(0); }
//           50% { opacity: 1; transform: translateY(-3px) translateX(0) rotate(0); }
//           100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
//         }
//         @keyframes disapear {
//           from { opacity: 1; }
//           to { opacity: 0; transform: translateX(5px) translateY(20px); color: var(--primary); filter: blur(5px); }
//         }

//         .btn-5 .state--default .icon svg { animation: land 0.6s ease forwards; }
//         .btn-5:hover .state--default .icon { transform: rotate(45deg) scale(1.25); }
//         .btn-5.sent-active .state--default svg { animation: takeOff 0.8s linear forwards; }
//         .btn-5.sent-active .state--default .icon { transform: rotate(0) scale(1.25); }
//         @keyframes takeOff {
//           0% { opacity: 1; }
//           60% { opacity: 1; transform: translateX(70px) rotate(45deg) scale(2); }
//           100% { opacity: 0; transform: translateX(160px) rotate(45deg) scale(0); }
//         }
//         @keyframes land {
//           0% { transform: translateX(-60px) translateY(30px) rotate(-50deg) scale(2); opacity: 0; filter: blur(3px); }
//           100% { transform: translateX(0) translateY(0) rotate(0); opacity: 1; filter: blur(0); }
//         }

//         .btn-5 .state--default .icon:before {
//           content: "";
//           position: absolute;
//           top: 50%;
//           height: 2px;
//           width: 0;
//           left: -5px;
//           background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.5));
//         }
//         .btn-5.sent-active .state--default .icon:before { animation: contrail 0.8s linear forwards; }
//         @keyframes contrail {
//           0% { width: 0; opacity: 1; }
//           8% { width: 15px; }
//           60% { opacity: 0.7; width: 80px; }
//           100% { opacity: 0; width: 160px; }
//         }

//         .btn-5 .state { padding-left: 29px; z-index: 2; display: flex; position: relative; }
//         .btn-5 .state--sent { display: none; }
//         .btn-5 .state--sent svg { transform: scale(1.25); margin-right: 8px; }
//         .btn-5.sent-active .state--default { position: absolute; }
//         .btn-5.sent-active .state--sent { display: flex; }
//         .btn-5.sent-active .state--sent span {
//           opacity: 0;
//           animation: slideDown 0.8s ease forwards calc(var(--i) * 0.2s);
//         }
//         .btn-5.sent-active .state--sent .icon svg {
//           opacity: 0;
//           animation: appear 1.2s ease forwards 0.8s;
//         }
//         @keyframes appear {
//           0% { opacity: 0; transform: scale(4) rotate(-40deg); color: var(--primary); filter: blur(4px); }
//           30% { opacity: 1; transform: scale(0.6); filter: blur(1px); }
//           50% { opacity: 1; transform: scale(1.2); filter: blur(0); }
//           100% { opacity: 1; transform: scale(1); }
//         }
//       `}</style>
//     </main>
//   );
// }
















// "use client";

// import { useState, useEffect } from "react";
// import Navbar from "./components/Navbar";
// import MewowBot from "./components/MewowBot";
// import { Facebook, Twitter, MessageCircle, Send, Paperclip, Mic, MoreVertical } from "lucide-react";
// import { motion, Variants, AnimatePresence } from "framer-motion";

// // --- ANIMATION VARIANTS ---
// const fadeInUp: Variants = {
//   hidden: { opacity: 0, y: 40 },
//   visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
// };

// const staggerContainer: Variants = {
//   hidden: { opacity: 0 },
//   visible: {
//     opacity: 1,
//     transition: { staggerChildren: 0.2 }
//   }
// };

// // --- GLOW BUTTON COMPONENT (SOCIALS) ---
// const SocialButton = ({ icon: Icon, href, color, isTikTok = false, isInsta = false }: any) => {
//   return (
//     <motion.a
//       href={href}
//       variants={fadeInUp}
//       whileHover={{ y: -8 }}
//       whileTap={{ scale: 0.9 }}
//       style={{ "--btn-color": color } as React.CSSProperties}
//       className={`
//         group relative flex items-center justify-center w-14 h-14 
//         bg-white rounded-full shadow-lg transition-all duration-300 ease-out
//         hover:shadow-[0_0_25px_5px_var(--btn-color)]
//       `}
//     >
//       <div className={`absolute inset-0 rounded-full opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out ${isInsta ? "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]" : "bg-[var(--btn-color)]"}`} />
//       <div className="relative z-10 text-slate-500 transition-colors duration-300 group-hover:text-white">
//         {isTikTok ? (
//           <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" /></svg>
//         ) : isInsta ? (
//           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
//         ) : (
//           <Icon size={22} />
//         )}
//       </div>
//     </motion.a>
//   );
// };

// export default function Home() {
//   const [isBooked, setIsBooked] = useState(false);
//   const [isChatSent, setIsChatSent] = useState(false);
//   const [showRefresh, setShowRefresh] = useState(false);
//   const [showChatWindow, setShowChatWindow] = useState(false);
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   const handleChatClick = () => {
//     if (isChatSent) return;

//     // 1. Trigger the GOATed button animation
//     setIsChatSent(true);

//     // 2. Wait 7 seconds (Allows "Chat with AI" text to fully animate)
//     setTimeout(() => {
//       setShowRefresh(true);

//       // 3. Show loader for 6 seconds, then switch to full Chat Window
//       setTimeout(() => {
//         setShowRefresh(false);
//         setShowChatWindow(true);
//       }, 6000); // 6 seconds wait time for loader
//     }, 7000); // 7 seconds wait time for button animation
//   };

//   if (!mounted) return null;

//   return (
//     <main className="relative min-h-screen bg-[#E3EBF3] flex flex-col overflow-hidden font-sans">

//       {/* Background Pulse */}
//       <motion.div
//         animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
//         transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_#FFFFFF_5%,_transparent_50%)] opacity-60"
//       />

//       <Navbar />

//       <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-center px-12 pt-32">

//         {/* LEFT SIDE CONTENT */}
//         <motion.div className="relative z-10 space-y-8" variants={staggerContainer} initial="hidden" animate="visible">

//           <motion.div variants={fadeInUp} className="w-fit bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-md px-5 py-2 rounded-full border border-blue-500/20 text-[11px] font-black text-blue-600 tracking-[0.2em] uppercase shadow-sm">
//             🚀 The Future Is Here!
//           </motion.div>

//           <motion.h1 variants={fadeInUp} className="text-7xl lg:text-[90px] font-medium text-slate-900 tracking-tighter leading-[0.9]">
//             The Engine for <br />
//             <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900">Next-Gen Healthcare</span>
//           </motion.h1>

//           <motion.p variants={fadeInUp} className="text-slate-500 text-lg max-w-lg leading-relaxed">
//             Go beyond simple search— Transform static documents into an interactive knowledge base. Ask questions in plain language and get clear, context-aware answers.
//           </motion.p>

//           {/* --- BUTTONS ROW --- */}
//           <div className="flex items-center gap-5 pt-4 h-24">

//             {/* 1. APPOINTMENT BUTTON */}
//             <motion.button
//               layout
//               onClick={() => setIsBooked(!isBooked)}
//               transition={{ type: "spring", stiffness: 400, damping: 25 }}
//               className="group relative overflow-hidden bg-black text-white rounded-full px-8 py-4 font-bold shadow-xl hover:shadow-2xl active:scale-95 transition-shadow h-[64px] flex items-center justify-center min-w-[160px]"
//             >
//               <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />

//               <AnimatePresence mode="popLayout" initial={false}>
//                 {isBooked ? (
//                   <motion.span key="booked" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 whitespace-nowrap">
//                     📞 Book a Call
//                   </motion.span>
//                 ) : (
//                   <motion.span key="initial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 whitespace-nowrap">
//                     Appointment
//                   </motion.span>
//                 )}
//               </AnimatePresence>
//             </motion.button>

//             {/* 2. ✨ BUTTON 5: CHAT BUTTON ✨ */}
//             <button
//               className={`btn-5 ${isChatSent ? 'sent-active' : ''}`}
//               onClick={handleChatClick}
//             >
//               <div className="outline"></div>

//               <div className="state state--default">
//                 <div className="icon">
//                   <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//                     <g style={{ filter: 'url(#shadow)' }}>
//                       <path d="M14.2199 21.63C13.0399 21.63 11.3699 20.8 10.0499 16.83L9.32988 14.67L7.16988 13.95C3.20988 12.63 2.37988 10.96 2.37988 9.78001C2.37988 8.61001 3.20988 6.93001 7.16988 5.60001L15.6599 2.77001C17.7799 2.06001 19.5499 2.27001 20.6399 3.35001C21.7299 4.43001 21.9399 6.21001 21.2299 8.33001L18.3999 16.82C17.0699 20.8 15.3999 21.63 14.2199 21.63ZM7.63988 7.03001C4.85988 7.96001 3.86988 9.06001 3.86988 9.78001C3.86988 10.5 4.85988 11.6 7.63988 12.52L10.1599 13.36C10.3799 13.43 10.5599 13.61 10.6299 13.83L11.4699 16.35C12.3899 19.13 13.4999 20.12 14.2199 20.12C14.9399 20.12 16.0399 19.13 16.9699 16.35L19.7999 7.86001C20.3099 6.32001 20.2199 5.06001 19.5699 4.41001C18.9199 3.76001 17.6599 3.68001 16.1299 4.19001L7.63988 7.03001Z" fill="currentColor"></path>
//                       <path d="M10.11 14.4C9.92005 14.4 9.73005 14.33 9.58005 14.18C9.29005 13.89 9.29005 13.41 9.58005 13.12L13.16 9.53C13.45 9.24 13.93 9.24 14.22 9.53C14.51 9.82 14.51 10.3 14.22 10.59L10.64 14.18C10.5 14.33 10.3 14.4 10.11 14.4Z" fill="currentColor"></path>
//                     </g>
//                     <defs>
//                       <filter id="shadow">
//                         <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodOpacity="0.5"></feDropShadow>
//                       </filter>
//                     </defs>
//                   </svg>
//                 </div>
//                 <p>
//                   {"Chat".split("").map((char, i) => (
//                     <span key={i} style={{ "--i": i } as React.CSSProperties}>{char}</span>
//                   ))}
//                 </p>
//               </div>

//               <div className="state state--sent">
//                 <div className="icon">
//                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="1em" width="1em" strokeWidth="0.5px" stroke="black">
//                     <g style={{ filter: 'url(#shadow)' }}>
//                       <path fill="currentColor" d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z"></path>
//                       <path fill="currentColor" d="M10.5795 15.5801C10.3795 15.5801 10.1895 15.5001 10.0495 15.3601L7.21945 12.5301C6.92945 12.2401 6.92945 11.7601 7.21945 11.4701C7.50945 11.1801 7.98945 11.1801 8.27945 11.4701L10.5795 13.7701L15.7195 8.6301C16.0095 8.3401 16.4895 8.3401 16.7795 8.6301C17.0695 8.9201 17.0695 9.4001 16.7795 9.6901L11.1095 15.3601C10.9695 15.5001 10.7795 15.5801 10.5795 15.5801Z"></path>
//                     </g>
//                   </svg>
//                 </div>
//                 <p>
//                   {"Chat with AI ✨".split("").map((char, i) => (
//                     <span key={i} style={{ "--i": i + 5 } as React.CSSProperties}>{char === " " ? "\u00A0" : char}</span>
//                   ))}
//                 </p>
//               </div>
//             </button>

//           </div>

//           {/* SOCIAL ICONS */}
//           <motion.div variants={fadeInUp} className="relative z-50 flex items-center gap-5 pt-8">
//             <SocialButton icon={Facebook} href="#" color="#1877F2" />
//             <SocialButton icon={Twitter} href="#" color="#1DA1F2" />
//             <SocialButton icon={null} isInsta={true} href="#" color="#bc1888" />
//             <SocialButton icon={null} isTikTok={true} href="#" color="#000000" />
//             <SocialButton icon={MessageCircle} href="#" color="#25D366" />
//           </motion.div>
//         </motion.div>

//         {/* RIGHT SIDE: BOT ONLY */}
//         <div className="relative z-20 flex justify-center items-center h-[850px] lg:-ml-40 overflow-visible w-full pointer-events-none">
//           <MewowBot />
//         </div>
//       </div>

//       {/* --- REFRESH LOADING WINDOW (THE GOATED BELL LOADER) --- */}
//       <AnimatePresence>
//         {showRefresh && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             transition={{ duration: 0.5 }}
//             className="preloader" // Uses the GOATED CSS class below
//           >
//             <div className="preloader-body">
//               <div className="cssload-bell">
//                 {[0, 1, 2, 3, 4].map((i) => (
//                   <div key={i} className="cssload-circle">
//                     <div className="cssload-inner"></div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//             <div className="instructions">
//               <p>Loading your experience...</p>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* --- FULL PAGE 2: CHAT WINDOW --- */}
//       <AnimatePresence>
//         {showChatWindow && (
//           <motion.div
//             initial={{ opacity: 0, y: 50 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.5, ease: "easeInOut" }}
//             className="fixed inset-0 z-[9999] bg-[#F5F7FA] flex font-sans"
//           >
//             {/* Sidebar */}
//             <div className="w-80 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
//               <div className="p-6 border-b border-slate-100 flex items-center gap-3">
//                 <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">AI</div>
//                 <h2 className="text-xl font-bold text-slate-800">MewowChat</h2>
//               </div>
//               <div className="flex-1 overflow-y-auto p-4 space-y-2">
//                 <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">History</div>
//                 {[1, 2, 3].map((i) => (
//                   <div key={i} className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer text-slate-600 text-sm flex items-center gap-3 transition-colors">
//                     <MessageCircle size={16} className="text-slate-400" />
//                     <span className="truncate">Previous Session #{i}</span>
//                   </div>
//                 ))}
//               </div>
//               <div className="p-4 border-t border-slate-100">
//                 <button className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
//                   + New Chat
//                 </button>
//               </div>
//             </div>

//             {/* Main Chat Area */}
//             <div className="flex-1 flex flex-col relative bg-[#F5F7FA]">
//               {/* Header */}
//               <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
//                 <div className="flex items-center gap-3">
//                   <div className="lg:hidden w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">AI</div>
//                   <div>
//                     <h3 className="font-bold text-slate-800">Healthcare Assistant</h3>
//                     <p className="text-xs text-green-500 flex items-center gap-1">● Online</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><MoreVertical size={20} /></button>
//                   <button onClick={() => setShowChatWindow(false)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">✕</button>
//                 </div>
//               </header>

//               {/* Chat Messages Area */}
//               <div className="flex-1 overflow-y-auto p-6 space-y-6">
//                 {/* Bot Msg */}
//                 <div className="flex gap-4 max-w-3xl">
//                   <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 flex-shrink-0">🤖</div>
//                   <div className="space-y-2">
//                     <div className="bg-white p-5 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
//                       Hello! I'm your advanced healthcare assistant. I can help you analyze documents, schedule appointments, or answer medical queries. How can I help you today?
//                     </div>
//                     <span className="text-xs text-slate-400 pl-2">Just now</span>
//                   </div>
//                 </div>
//               </div>

//               {/* Input Area */}
//               <div className="p-6 bg-white border-t border-slate-200">
//                 <div className="max-w-4xl mx-auto relative">
//                   <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
//                     <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"><Paperclip size={20} /></button>
//                     <input
//                       type="text"
//                       placeholder="Type your message here..."
//                       className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 px-2"
//                     />
//                     <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"><Mic size={20} /></button>
//                     <button className="p-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"><Send size={18} /></button>
//                   </div>
//                   <p className="text-center text-[10px] text-slate-400 mt-2">AI can make mistakes. Please verify important medical information.</p>
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       <style jsx global>{`
//         /* --- GOATED BELL LOADER CSS --- */
//         .preloader {
//             position: fixed;
//             inset: 0;
//             z-index: 10000; /* High z-index to cover everything */
//             display: flex;
//             flex-direction: column;
//             justify-content: center;
//             align-items: center;
//             background: #ffffff;
//         }

//         .preloader * {
//             box-sizing: content-box;
//         }

//         .cssload-bell {
//             width: 97px;
//             height: 99px;
//             border-radius: 100%;
//             position: relative;
//             animation: cssload-spin 5.75s linear infinite;
//         }

//         .cssload-circle {
//             width: 100%;
//             height: 100%;
//             position: absolute;
//         }

//         .cssload-circle .cssload-inner {
//             width: 100%;
//             height: 100%;
//             border-radius: 100%;
//             border-bottom: 5px solid rgb(47, 49, 148);
//             border-left: 5px solid rgb(47, 49, 148);
//             border-right: none;
//             border-top: none;
//             box-shadow: rgb(109, 111, 204) 0px 0px 10px inset;
//             animation: cssload-spin 2.3s linear infinite;
//         }

//         .cssload-circle:nth-of-type(1) { transform: rotate(0deg); }
//         .cssload-circle:nth-of-type(2) { transform: rotate(70deg); }
//         .cssload-circle:nth-of-type(3) { transform: rotate(140deg); }
//         .cssload-circle:nth-of-type(4) { transform: rotate(210deg); }
//         .cssload-circle:nth-of-type(5) { transform: rotate(280deg); }

//         @keyframes cssload-spin {
//             0% { transform: rotate(0deg); }
//             100% { transform: rotate(360deg); }
//         }

//         .instructions {
//             position: absolute;
//             bottom: 20px;
//             text-align: center;
//             color: #666;
//         }

//         /* --- BUTTON 5 CSS INTEGRATION (Your GOATed code) --- */
//         @keyframes shine {
//           0% { transform: translateX(-100%) skewX(-15deg); }
//           100% { transform: translateX(200%) skewX(-15deg); }
//         }
//         .btn-5 {
//           --primary: #8f44fd;
//           --radius: 32px;
//           cursor: pointer;
//           border-radius: var(--radius);
//           text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
//           border: none;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           position: relative;
//           transition: all 0.3s ease;
//           min-width: 140px;
//           width: fit-content;
//           padding: 0 20px;
//           height: 64px;
//           font-family: inherit;
//           font-size: 18px;
//           font-weight: 600;
//           background: #fff;
//           color: #111; 
//         }
//         .btn-5:hover { transform: scale(1.02); }
//         .btn-5:active { transform: scale(1); }
//         .btn-5:after {
//           content: "";
//           position: absolute;
//           inset: 0;
//           border-radius: var(--radius);
//           background: #fff;
//           border: 2.5px solid transparent;
//           z-index: 0;
//           transition: all 0.4s ease;
//         }
//         .btn-5:hover::after { transform: scale(1.05, 1.1); }
//         .btn-5::before {
//           content: "";
//           inset: 7px 6px 6px 6px;
//           position: absolute;
//           border-radius: 30px;
//           filter: blur(0.5px);
//           z-index: 2;
//         }
//         .btn-5 .state p {
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           margin: 0;
//         }
//         .btn-5 .state .icon {
//           position: absolute;
//           left: 0;
//           top: 0;
//           bottom: 0;
//           margin: auto;
//           transform: scale(1.25);
//           transition: all 0.3s ease;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//         }
//         .btn-5 .state .icon svg { overflow: visible; }

//         .btn-5 .outline {
//           position: absolute;
//           border-radius: inherit;
//           overflow: hidden;
//           z-index: 1;
//           opacity: 0;
//           transition: opacity 0.4s ease;
//           inset: -2px -3.5px;
//         }
//         .btn-5 .outline::before {
//           content: "";
//           position: absolute;
//           inset: -100%;
//           background: conic-gradient(from 180deg, transparent 60%, white 80%, transparent 100%);
//           animation: spin 2s linear infinite;
//           animation-play-state: paused;
//         }
//         @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
//         .btn-5:hover .outline { opacity: 1; }
//         .btn-5:hover .outline::before { animation-play-state: running; }

//         .btn-5 .state p span {
//           display: block;
//           opacity: 0;
//           animation: slideDown 0.8s ease forwards calc(var(--i) * 0.03s);
//         }
//         .btn-5:hover p span {
//           opacity: 1;
//           animation: wave 0.5s ease forwards calc(var(--i) * 0.02s);
//         }
//         .btn-5.sent-active p span {
//           opacity: 1;
//           animation: disapear 0.6s ease forwards calc(var(--i) * 0.03s);
//         }
//         @keyframes wave {
//           30% { opacity: 1; transform: translateY(4px) translateX(0) rotate(0); }
//           50% { opacity: 1; transform: translateY(-3px) translateX(0) rotate(0); color: var(--primary); }
//           100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
//         }
//         @keyframes slideDown {
//           0% { opacity: 0; transform: translateY(-20px) translateX(5px) rotate(-90deg); color: var(--primary); filter: blur(5px); }
//           30% { opacity: 1; transform: translateY(4px) translateX(0) rotate(0); filter: blur(0); }
//           50% { opacity: 1; transform: translateY(-3px) translateX(0) rotate(0); }
//           100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
//         }
//         @keyframes disapear {
//           from { opacity: 1; }
//           to { opacity: 0; transform: translateX(5px) translateY(20px); color: var(--primary); filter: blur(5px); }
//         }

//         .btn-5 .state--default .icon svg { animation: land 0.6s ease forwards; }
//         .btn-5:hover .state--default .icon { transform: rotate(45deg) scale(1.25); }
//         .btn-5.sent-active .state--default svg { animation: takeOff 0.8s linear forwards; }
//         .btn-5.sent-active .state--default .icon { transform: rotate(0) scale(1.25); }
//         @keyframes takeOff {
//           0% { opacity: 1; }
//           60% { opacity: 1; transform: translateX(70px) rotate(45deg) scale(2); }
//           100% { opacity: 0; transform: translateX(160px) rotate(45deg) scale(0); }
//         }
//         @keyframes land {
//           0% { transform: translateX(-60px) translateY(30px) rotate(-50deg) scale(2); opacity: 0; filter: blur(3px); }
//           100% { transform: translateX(0) translateY(0) rotate(0); opacity: 1; filter: blur(0); }
//         }

//         .btn-5 .state--default .icon:before {
//           content: "";
//           position: absolute;
//           top: 50%;
//           height: 2px;
//           width: 0;
//           left: -5px;
//           background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.5));
//         }
//         .btn-5.sent-active .state--default .icon:before { animation: contrail 0.8s linear forwards; }
//         @keyframes contrail {
//           0% { width: 0; opacity: 1; }
//           8% { width: 15px; }
//           60% { opacity: 0.7; width: 80px; }
//           100% { opacity: 0; width: 160px; }
//         }

//         .btn-5 .state { padding-left: 29px; z-index: 2; display: flex; position: relative; }
//         .btn-5 .state--sent { display: none; }
//         .btn-5 .state--sent svg { transform: scale(1.25); margin-right: 8px; }
//         .btn-5.sent-active .state--default { position: absolute; }
//         .btn-5.sent-active .state--sent { display: flex; }
//         .btn-5.sent-active .state--sent span {
//           opacity: 0;
//           animation: slideDown 0.8s ease forwards calc(var(--i) * 0.2s);
//         }
//         .btn-5.sent-active .state--sent .icon svg {
//           opacity: 0;
//           animation: appear 1.2s ease forwards 0.8s;
//         }
//         @keyframes appear {
//           0% { opacity: 0; transform: scale(4) rotate(-40deg); color: var(--primary); filter: blur(4px); }
//           30% { opacity: 1; transform: scale(0.6); filter: blur(1px); }
//           50% { opacity: 1; transform: scale(1.2); filter: blur(0); }
//           100% { opacity: 1; transform: scale(1); }
//         }
//       `}</style>
//     </main>
//   );
// }




// "use client";

// import Navbar from "./components/Navbar";
// import MewowBot from "./components/MewowBot";
// import { Phone, Facebook, Twitter, Instagram, MessageCircle } from "lucide-react";
// // FIX 1: Import 'Variants' type here 👇
// import { motion, Variants } from "framer-motion";

// // FIX 2: Add ': Variants' type to these objects 👇
// const fadeInUp: Variants = {
//   hidden: { opacity: 0, y: 40 },
//   visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
// };

// const staggerContainer: Variants = {
//   hidden: { opacity: 0 },
//   visible: {
//     opacity: 1,
//     transition: {
//       staggerChildren: 0.2
//     }
//   }
// };

// export default function Home() {
//   return (
//     <main className="relative min-h-screen bg-[#DDE3EA] flex flex-col overflow-hidden font-sans">
      
//       {/* Background Pulse */}
//       <motion.div 
//         animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
//         transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_#EBF1F7_5%,_transparent_50%)]" 
//       />
      
//       <Navbar />

//       <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-center px-12 pt-32">
        
//         {/* Left Side: Text Content */}
//         <motion.div 
//           className="relative z-10 space-y-10"
//           variants={staggerContainer}
//           initial="hidden"
//           animate="visible"
//         >
//           {/* Badge */}
//           <motion.div variants={fadeInUp} className="w-fit bg-white/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/40 text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase shadow-sm">
//             World's Most Adopted Healthcare AI
//           </motion.div>
          
//           {/* Hero Text */}
//           <motion.h1 variants={fadeInUp} className="text-8xl lg:text-[110px] font-medium text-slate-900 tracking-tighter leading-[0.85]">
//             Revolutionizing <br /> 
//             <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">
//               Healthcare with AI
//             </span>
//           </motion.h1>
          
//           {/* Subtext */}
//           <motion.p variants={fadeInUp} className="text-slate-500 text-xl max-w-lg leading-relaxed">
//             Redefine healthcare with AI experience. Faster diagnostics, tailored treatments, and intelligent care—designed by Fluttertop.
//           </motion.p>
          
//           {/* Button */}
//           <motion.div variants={fadeInUp} className="pt-4">
//             <button className="group relative flex items-center gap-3 bg-black text-white px-10 py-5 rounded-full font-bold shadow-2xl overflow-hidden transition-transform active:scale-95 hover:scale-105">
//               <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shine_1s_ease-in-out]" />
//               <Phone size={18} /> Book a call
//             </button>
//           </motion.div>

//           {/* Social Icons */}
//           <motion.div variants={fadeInUp} className="relative z-50 flex items-center gap-6 pt-12">
//              {[
//                 { Icon: Facebook, color: "hover:text-blue-600" },
//                 { Icon: Twitter, color: "hover:text-sky-400" },
//                 { Icon: Instagram, color: "hover:text-pink-500" },
//                 { Icon: MessageCircle, color: "hover:text-green-500" }
//              ].map((item, index) => (
//                <motion.a 
//                  key={index}
//                  href="#" 
//                  whileHover={{ y: -5, scale: 1.1 }}
//                  whileTap={{ scale: 0.9 }}
//                  className={`p-3 bg-white rounded-full shadow-lg text-slate-400 transition-colors ${item.color}`}
//                >
//                  <item.Icon size={22} />
//                </motion.a>
//              ))}
//           </motion.div>
//         </motion.div>

//         {/* Right Side: Bot + Floating Card */}
//         <div className="relative z-20 flex justify-center items-center h-[850px] lg:-ml-40 overflow-visible w-full">
           
//            <MewowBot />
           
//            {/* Levitating Card */}
//            <motion.div 
//              initial={{ opacity: 0, scale: 0.8, x: 50 }}
//              animate={{ 
//                opacity: 1, 
//                scale: 1, 
//                x: 0,
//                y: [0, -15, 0] 
//              }}
//              transition={{ 
//                opacity: { duration: 1, delay: 0.5 },
//                y: { duration: 4, repeat: Infinity, ease: "easeInOut" } 
//              }}
//              className="absolute top-[20%] right-[-10%] z-50 bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[3rem] shadow-2xl pointer-events-auto cursor-default hover:bg-white/90 transition-colors"
//            >
//               <div className="flex items-center gap-3">
//                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
//                  <p className="text-2xl font-black text-slate-900">300+</p>
//               </div>
//               <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Expert doctors</p>
//            </motion.div>
//         </div>

//       </div>
      
//       <style jsx global>{`
//         @keyframes shine {
//           0% { transform: translateX(-100%) skewX(-15deg); }
//           100% { transform: translateX(200%) skewX(-15deg); }
//         }
//       `}</style>
//     </main>
//   );
// }













// "use client";

// import Navbar from "./components/Navbar";
// import MewowBot from "./components/MewowBot";
// import { Phone, Facebook, Twitter, Instagram, MessageCircle } from "lucide-react";

// export default function Home() {
//   return (
//     <main className="relative min-h-screen bg-[#DDE3EA] flex flex-col overflow-hidden">
//       {/* 1. THE BACKGROUND GRADIENT (Matches your SS perfectly) */}
//       <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_#EBF1F7_5%,_transparent_50%)]" />
      
//       <Navbar />

//       <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-center px-12 pt-32">
        
//         {/* 2. LEFT SIDE: Text Content (Z-index 10) */}
//         <div className="relative z-10 space-y-10">
//           <div className="w-fit bg-white/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/40 text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
//             World's Most Adopted Healthcare AI
//           </div>
//           <h1 className="text-8xl lg:text-[110px] font-medium text-slate-900 tracking-tighter leading-[0.85]">
//             Revolutionizing <br /> Healthcare with AI
//           </h1>
//           <p className="text-slate-500 text-xl max-w-lg leading-relaxed">
//             Redefine healthcare with AI experience. Faster diagnostics, tailored treatments, and intelligent care—designed by Fluttertop.
//           </p>
          
//           <div className="pt-4">
//             <button className="flex items-center gap-3 bg-black text-white px-10 py-5 rounded-full font-bold shadow-2xl hover:bg-zinc-800 transition transform active:scale-95">
//               <Phone size={18} /> Book a call
//             </button>
//           </div>

//           {/* SOCIAL ICONS: Priority Z-50 (Always on top) */}
//           <div className="relative z-50 flex items-center gap-6 pt-12">
//              <a href="#" className="p-3 bg-white rounded-full shadow-lg hover:text-blue-600 transition hover:-translate-y-1"><Facebook size={22} /></a>
//              <a href="#" className="p-3 bg-white rounded-full shadow-lg hover:text-sky-400 transition hover:-translate-y-1"><Twitter size={22} /></a>
//              <a href="#" className="p-3 bg-white rounded-full shadow-lg hover:text-pink-500 transition hover:-translate-y-1"><Instagram size={22} /></a>
//              <a href="#" className="p-3 bg-white rounded-full shadow-lg hover:text-green-500 transition hover:-translate-y-1"><MessageCircle size={22} /></a>
//           </div>
//         </div>

//         {/* 3. RIGHT SIDE: Nigga-Bot (Z-index 20) */}
//         {/* 'overflow-visible' and 'w-full' ensure the 180% width component doesn't get cut */}
//         <div className="relative z-20 flex justify-center items-center h-[850px] lg:-ml-40 overflow-visible w-full">
//            <MewowBot />
           
//            {/* Expert Card: Priority Z-50 */}
//            <div className="absolute top-[20%] right-[-10%] z-50 bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[3rem] shadow-2xl pointer-events-auto">
//               <p className="text-2xl font-black text-slate-900">300+</p>
//               <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Expert doctors</p>
//            </div>
//         </div>

//       </div>
//     </main>
//   );
// }