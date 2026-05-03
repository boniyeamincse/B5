import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-blue-500/10 shrink-0">
          <BarChart3 className="w-7 h-7 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Global Rate Limits</h1>
          <p className="text-slate-400 mt-1">Configure system-wide request rate limits.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center min-h-64 border border-white/5 text-center">
        <BarChart3 className="w-14 h-14 text-blue-400 opacity-30 mb-4" />
        <p className="text-slate-400 font-medium text-lg">Global Rate Limits</p>
        <p className="text-slate-600 text-sm mt-1">This section is under development. Data will appear here once connected to the B5 backend API.</p>
      </div>
    </div>
  );
}
