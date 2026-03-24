"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, User, Bot } from "lucide-react";
import Link from "next/link";
// @ts-ignore
import { CATEGORIES, DOCTORS } from "../lib/data";

export default function ChatExperience() {
  const [selectedCategory, setSelectedCategory] = useState<string>("cardiology");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    
    // This is where we will later connect your Python "Brain" 🐍
    setTimeout(() => {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `I am your ${selectedCategory} AI assistant. How can I help you today? 🩺` 
      }]);
    }, 800);
  };

  // @ts-ignore
  const currentDoctors = DOCTORS[selectedCategory] || [];

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col relative overflow-hidden font-sans">
      
      {/* 1. HEADER */}
      <header className="px-6 py-4 flex items-center justify-between z-20 bg-white/50 backdrop-blur-md border-b border-slate-100">
        <Link href="/">
          <motion.div whileHover={{ x: -3 }} className="p-2 rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 cursor-pointer">
            <ArrowLeft size={20} />
          </motion.div>
        </Link>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full shadow-sm border border-slate-100">
          <Sparkles size={14} className="text-emerald-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">MediRAG Intelligence</span>
        </div>
      </header>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="flex flex-col items-center px-6 gap-8 max-w-4xl mx-auto w-full pt-8">
          
          {/* CATEGORY SLIDER (SS3 Vision) */}
          <div className="w-full">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Focus Area</p>
             <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
               {CATEGORIES.map((cat: any) => (
                 <motion.button
                   key={cat.id}
                   onClick={() => setSelectedCategory(cat.id)}
                   whileTap={{ scale: 0.95 }}
                   className={`relative flex-shrink-0 w-44 p-6 rounded-[2rem] text-left transition-all duration-500 snap-center border-2 
                   ${selectedCategory === cat.id ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white text-slate-500 border-transparent shadow-sm hover:border-slate-200"}`}
                 >
                   <div className="text-3xl mb-3">{cat.icon}</div>
                   <div className="font-bold text-lg leading-tight">{cat.name}</div>
                 </motion.button>
               ))}
             </div>
          </div>

          {/* DOCTOR PANEL (Synced with Selection) */}
          <div className="w-full">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Verified Specialists</p>
            <motion.div layout className="bg-white/60 backdrop-blur-xl border border-white p-4 rounded-[2.5rem] shadow-sm">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={selectedCategory} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {currentDoctors.map((doc: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-3xl bg-white border border-slate-50 shadow-sm">
                      <div className={`w-12 h-12 rounded-2xl ${doc.image} flex items-center justify-center font-bold text-slate-400 text-xs`}>DOC</div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{doc.name}</h3>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{doc.role}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* MESSAGES DISPLAY */}
          <div className="w-full space-y-6 mt-4 pb-10">
              {messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    key={i} 
                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                      <div className={`p-2 rounded-full ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-emerald-500 text-white'}`}>
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`max-w-[75%] p-4 rounded-[1.5rem] shadow-sm font-medium text-sm
                        ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                          {msg.content}
                      </div>
                  </motion.div>
              ))}
          </div>
        </div>
      </div>

      {/* 3. INPUT (Floating Bar) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent z-30">
        <div className="max-w-2xl mx-auto relative group">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            type="text" 
            placeholder={`Ask about ${selectedCategory}...`}
            className="w-full pl-7 pr-16 py-5 rounded-[2rem] bg-white border-none shadow-2xl focus:ring-2 focus:ring-slate-900 transition-all text-slate-800"
          />
          <button 
            onClick={sendMessage} 
            title="Send message" 
            className="absolute right-3 top-3 bottom-3 aspect-square bg-slate-900 rounded-2xl text-white flex items-center justify-center hover:bg-emerald-500 transition-all active:scale-90"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}