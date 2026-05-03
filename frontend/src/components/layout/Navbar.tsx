"use client";

import React from 'react';
import { 
  Bell, 
  Search, 
  User, 
  ChevronDown 
} from 'lucide-react';

export default function Navbar() {
  return (
    <header className="h-20 glass border-b border-white/5 sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search for IPs, Rules, or Logs..." 
          className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00ffff]/30 transition-colors"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#00ffff] rounded-full border-2 border-[#0f172a]"></span>
        </button>

        <div className="h-8 w-px bg-white/10"></div>

        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ffff] to-[#38bdf8] p-[1px]">
            <div className="w-full h-full rounded-xl bg-[#0f172a] flex items-center justify-center overflow-hidden">
              <User className="w-6 h-6 text-[#00ffff]" />
            </div>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-white group-hover:text-[#00ffff] transition-colors">Admin User</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Chief Security Officer</p>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </header>
  );
}
