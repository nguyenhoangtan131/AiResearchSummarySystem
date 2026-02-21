// src/components/ui/PromptInput.tsx
import { ArrowUpRight } from "lucide-react";

export default function PromptInput() {
  return (
    <div className="group relative w-full max-w-2xl">
      {/* Hiệu ứng Glow mờ phía sau khi hover vào toàn bộ group */}
      <div className="absolute -inset-1 rounded-[2.5rem] bg-linear-to-r from-indigo-500 to-purple-600 opacity-20 blur transition duration-1000 group-hover:opacity-40 group-focus-within:opacity-40"></div>
      
      <div className="relative flex items-center">
        <input 
          type="text"
          placeholder="Nhập đề tài nghiên cứu của bạn..."
          className="h-16 w-full rounded-full border border-slate-200 bg-white px-8 pr-16 text-lg text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
        
        <button className="absolute right-2 h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-90 group-focus-within:bg-indigo-700">
          <ArrowUpRight className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}