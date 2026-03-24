"use client";
import { Stethoscope } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6">
      <div className="flex items-center gap-4 rounded-full border border-white/20 bg-white/60 px-6 py-3 backdrop-blur-xl shadow-sm hover:bg-white/80 transition">
        <div className="rounded-full bg-emerald-500 p-1.5 text-white">
          <Stethoscope size={18} />
        </div>
        <span className="font-semibold text-slate-800 tracking-tight">
          {/* --- ORIGINAL: MediRAG <span className="text-emerald-500">AI</span> --- */}
          Curely <span className="text-emerald-500">AI🩺</span>
        </span>
      </div>
    </nav>
  );
}