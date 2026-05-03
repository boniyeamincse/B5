"use client";

import React from 'react';
import { 
  Database, 
  Cpu, 
  MemoryStick as Memory, 
  HardDrive, 
  Activity, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SystemHealth() {
  const components = [
    { name: 'WAF Core Proxy', status: 'Healthy', uptime: '12d 4h 22m', load: '12%', color: 'text-green-500' },
    { name: 'FastAPI Backend', status: 'Healthy', uptime: '12d 4h 23m', load: '4%', color: 'text-green-500' },
    { name: 'Redis Cache', status: 'Healthy', uptime: '15d 1h 10m', load: '0.2%', color: 'text-green-500' },
    { name: 'PostgreSQL DB', status: 'Healthy', uptime: '15d 1h 10m', load: '2%', color: 'text-green-500' },
    { name: 'Elasticsearch', status: 'Warning', uptime: '2d 12h 45m', load: '85%', color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight">System <span className="text-green-500">Health</span></h2>
        <p className="text-slate-500 mt-1">Infrastructure resource monitoring and component status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Avg CPU Usage', value: '24%', icon: Cpu, color: 'text-[#00ffff]' },
          { label: 'Avg RAM Usage', value: '4.2 GB', icon: Memory, color: 'text-blue-500' },
          { label: 'Disk Storage', value: '12%', icon: HardDrive, color: 'text-purple-500' },
          { label: 'Active Conns', value: '4,284', icon: Activity, color: 'text-green-500' },
        ].map((item, i) => (
          <div key={i} className="glass p-6 rounded-2xl border border-white/5">
            <div className="p-3 bg-white/5 rounded-xl w-fit mb-4">
              <item.icon className={cn("w-6 h-6", item.color)} />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
            <p className="text-2xl font-black text-white">{item.value}</p>
            <div className="h-1 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
              <div className={cn("h-full rounded-full", item.color === 'text-[#00ffff]' ? 'bg-[#00ffff]' : 'bg-slate-500')} style={{ width: item.value }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="bg-white/5 p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Component <span className="text-[#00ffff]">Status</span></h3>
        </div>
        <div className="divide-y divide-white/5">
          {components.map((comp, i) => (
            <div key={i} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  comp.status === 'Healthy' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                )}>
                  {comp.status === 'Healthy' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-white font-bold">{comp.name}</p>
                  <p className="text-xs text-slate-500">Uptime: {comp.uptime}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={cn("text-xs font-black uppercase tracking-widest mb-1", comp.color)}>
                  {comp.status}
                </div>
                <p className="text-slate-400 text-xs font-medium">Load: {comp.load}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
