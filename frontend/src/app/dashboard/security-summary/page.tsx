"use client";

import React from 'react';
import { 
  ShieldAlert, 
  Target, 
  ShieldCheck, 
  Zap,
  Lock,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SecuritySummary() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight">Security <span className="text-[#00ffff]">Summary</span></h2>
        <p className="text-slate-500 mt-1">Deep analysis of threat vectors and enforcement actions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Threat <span className="text-[#00ffff]">Levels</span></h3>
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div className="space-y-4">
            {[
              { label: 'Critical', value: '42', color: 'bg-purple-500', width: 'w-[15%]' },
              { label: 'High Risk', value: '1,284', color: 'bg-red-500', width: 'w-[45%]' },
              { label: 'Medium', value: '3,432', color: 'bg-yellow-500', width: 'w-[30%]' },
              { label: 'Low', value: '8,124', color: 'bg-blue-500', width: 'w-[10%]' },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-white">{item.value}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full glow-cyan", item.color, item.width)}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6">Top <span className="text-[#00ffff]">Attack Vectors</span></h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { type: 'SQL Injection', count: '4,520', icon: Target },
              { type: 'XSS Attempt', count: '3,210', icon: Zap },
              { type: 'Path Traversal', count: '1,840', icon: AlertTriangle },
              { type: 'API Abuse', count: '920', icon: Activity },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#00ffff]/20 transition-all cursor-default">
                <div className="p-3 bg-[#00ffff]/10 rounded-xl">
                  <item.icon className="w-5 h-5 text-[#00ffff]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.type}</p>
                  <p className="text-xs text-slate-500">{item.count} events detected</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-3xl border border-white/5 h-64 flex flex-col items-center justify-center text-center">
        <Lock className="w-12 h-12 text-[#00ffff]/20 mb-4" />
        <h4 className="text-white font-bold mb-2">Enforcement Timeline Placeholder</h4>
        <p className="text-sm text-slate-500 max-w-md">Detailed visualization of blocking actions over the last 30 days is coming soon with Recharts integration.</p>
      </div>
    </div>
  );
}
