"use client";

import React from 'react';
import { 
  Activity, 
  Download, 
  Trash2, 
  AlertTriangle,
  Info,
  Clock,
  ShieldX,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

const events = [
  { id: 1, ip: '192.168.1.105', host: 'api.b5waf.com', type: 'SQL Injection', path: '/api/v1/users', risk: 'High', action: 'Blocked', time: '2m ago' },
  { id: 2, ip: '45.12.33.19', host: 'app.b5waf.com', type: 'XSS Attempt', path: '/login', risk: 'High', action: 'Blocked', time: '5m ago' },
  { id: 3, ip: '103.44.12.8', host: 'api.b5waf.com', type: 'Path Traversal', path: '/static/../../etc/passwd', risk: 'Critical', action: 'Blocked', time: '12m ago' },
  { id: 4, ip: '12.233.1.2', host: 'app.b5waf.com', type: 'Allowed Request', path: '/dashboard', risk: 'None', action: 'Allowed', time: '15m ago' },
  { id: 5, ip: '192.168.1.105', host: 'api.b5waf.com', type: 'Rate Limit Exceeded', path: '/api/v1/auth', risk: 'Medium', action: 'Throttled', time: '22m ago' },
];

export default function EventsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Security <span className="text-[#00ffff]">Events</span></h2>
          <p className="text-slate-500 mt-1">Audit log of all intercepted and processed traffic.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white/5 text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-all">
            <Download className="w-4 h-4 text-[#00ffff]" />
            Export Logs
          </button>
          <button className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2.5 rounded-xl font-bold hover:bg-red-500/20 transition-all">
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Blocked Attacks', value: '4,532', icon: ShieldX, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Suspicious Traffic', value: '128', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'System Logs', value: '1.2M', icon: Info, color: 'text-[#00ffff]', bg: 'bg-[#00ffff]/10' },
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#00ffff]/10 text-[#00ffff] rounded-full text-[10px] font-bold border border-[#00ffff]/20">
              <Activity className="w-3 h-3" />
              LIVE FEED
            </div>
            <span className="text-[11px] text-slate-500 font-medium italic">Streaming real-time events...</span>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Source IP</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Attack Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Path</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-[11px]">{event.time}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-bold text-white font-mono">{event.ip}</p>
                    <p className="text-[10px] text-slate-500">{event.host}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold",
                    event.risk === 'Critical' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' : 
                    event.risk === 'High' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                    event.risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  )}>
                    {event.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-slate-400 truncate max-w-[150px]">{event.path}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    event.action === 'Blocked' ? 'text-red-500' : 
                    event.action === 'Throttled' ? 'text-yellow-500' : 'text-green-500'
                  )}>
                    {event.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-[#00ffff] transition-all">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
