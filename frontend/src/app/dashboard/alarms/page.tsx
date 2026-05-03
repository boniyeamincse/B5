"use client";

import React from 'react';
import { 
  Bell, 
  AlertCircle, 
  ShieldAlert, 
  Zap,
  Info,
  Clock,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

const alarms = [
  { id: 1, severity: 'Critical', message: 'Brute force attack detected on /api/v1/auth', time: '1m ago', source: 'Rate Limiter' },
  { id: 2, severity: 'High', message: 'Persistent SQLi attempts from single IP (45.12.33.19)', time: '5m ago', source: 'WAF Core' },
  { id: 3, severity: 'Medium', message: 'Backend response latency exceeded threshold (500ms)', time: '12m ago', source: 'Monitoring' },
  { id: 4, severity: 'Low', message: 'Configuration sync successful across all nodes', time: '45m ago', source: 'Control Plane' },
];

export default function ActiveAlarms() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Active <span className="text-red-500">Alarms</span></h2>
          <p className="text-slate-500 mt-1">Real-time alerts and system notifications.</p>
        </div>
        <button className="text-sm font-bold text-[#00ffff] hover:underline underline-offset-4">Mark all as read</button>
      </div>

      <div className="space-y-4">
        {alarms.map((alarm) => (
          <div key={alarm.id} className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-6 group hover:border-[#00ffff]/20 transition-all">
            <div className={cn(
              "p-4 rounded-2xl shrink-0 shadow-lg",
              alarm.severity === 'Critical' ? 'bg-red-500/20 text-red-500 shadow-red-500/10' :
              alarm.severity === 'High' ? 'bg-orange-500/20 text-orange-500 shadow-orange-500/10' :
              alarm.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-500 shadow-yellow-500/10' : 'bg-[#00ffff]/20 text-[#00ffff] shadow-cyan-500/10'
            )}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                  alarm.severity === 'Critical' ? 'text-red-500 border-red-500/20 bg-red-500/5' :
                  alarm.severity === 'High' ? 'text-orange-500 border-orange-500/20 bg-orange-500/5' :
                  alarm.severity === 'Medium' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' : 'text-[#00ffff] border-[#00ffff]/20 bg-[#00ffff]/5'
                )}>
                  {alarm.severity}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{alarm.source}</span>
              </div>
              <p className="text-white font-bold text-lg truncate">{alarm.message}</p>
            </div>

            <div className="flex items-center gap-8 shrink-0">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold">{alarm.time}</span>
              </div>
              <button className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-[#00ffff] hover:bg-[#00ffff]/10 transition-all group-hover:translate-x-1">
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <Zap className="w-6 h-6 text-red-500 animate-pulse" />
          </div>
          <div>
            <h4 className="text-red-500 font-black text-xl">IMMEDIATE ATTENTION REQUIRED</h4>
            <p className="text-red-500/70 text-sm font-medium">An active brute force attack is currently being mitigated by the Rate Limiter.</p>
          </div>
        </div>
        <button className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
          INVESTIGATE
        </button>
      </div>
    </div>
  );
}
