import React from 'react';
import { Clock } from 'lucide-react';

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-orange-500/10 shrink-0">
          <Clock className="w-7 h-7 text-orange-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Temporary Blocks</h1>
          <p className="text-slate-400 mt-1">View and manage active temporary IP blocks.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center min-h-64 border border-white/5 text-center">
        <Clock className="w-14 h-14 text-orange-400 opacity-30 mb-4" />
        <p className="text-slate-400 font-medium text-lg">Temporary Blocks</p>
        <p className="text-slate-600 text-sm mt-1">This section is under development. Data will appear here once connected to the B5 backend API.</p>
      </div>
    </div>
  );
}
