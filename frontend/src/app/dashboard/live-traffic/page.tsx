import React from 'react';
import { Wifi } from 'lucide-react';

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-[#00ffff]/10 shrink-0">
          <Wifi className="w-7 h-7 text-[#00ffff]" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Live Traffic</h1>
          <p className="text-slate-400 mt-1">Real-time request stream.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center min-h-64 border border-white/5 text-center">
        <Wifi className="w-14 h-14 text-[#00ffff] opacity-30 mb-4" />
        <p className="text-slate-400 font-medium text-lg">Live Traffic</p>
        <p className="text-slate-600 text-sm mt-1">This section is under development. Data will appear here once connected to the B5 backend API.</p>
      </div>
    </div>
  );
}
