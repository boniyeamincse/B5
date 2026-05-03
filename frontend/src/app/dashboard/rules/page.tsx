"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck,
  Power,
  Trash2,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

const rules = [
  { id: 1, name: 'SQL Injection - Basic Patterns', type: 'SQLi', pattern: '(\%27)|(\')|(\-\-)|(\%23)|(#)', action: 'Block', enabled: true, risk: 'High' },
  { id: 2, name: 'Cross-Site Scripting - Script Tags', type: 'XSS', pattern: '<script.*?>.*?</script>', action: 'Block', enabled: true, risk: 'High' },
  { id: 3, name: 'Path Traversal - Directory Climbing', type: 'LFI', pattern: '\.\.\/\.\.\/', action: 'Block', enabled: false, risk: 'Medium' },
  { id: 4, name: 'Global Rate Limit - API', type: 'Rate Limit', pattern: '/api/v1/*', action: 'Throttle', enabled: true, risk: 'Low' },
  { id: 5, name: 'Command Injection - Shell Meta', type: 'RCE', pattern: ';|&&|\|\|', action: 'Block', enabled: true, risk: 'Critical' },
];

export default function RulesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Rule <span className="text-[#00ffff]">Management</span></h2>
          <p className="text-slate-500 mt-1">Configure and deploy traffic inspection signatures.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#00ffff] text-[#0f172a] px-6 py-3 rounded-xl font-bold hover:bg-[#00ffff]/80 transition-all glow-cyan">
          <Plus className="w-5 h-5" />
          Create New Rule
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search rules by name, pattern or type..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#00ffff]/30 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rule Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-[#00ffff]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{rule.name}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">{rule.pattern}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300">
                    {rule.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-300">{rule.action}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-tighter",
                    rule.risk === 'Critical' ? 'text-purple-500' : 
                    rule.risk === 'High' ? 'text-red-500' : 
                    rule.risk === 'Medium' ? 'text-yellow-500' : 'text-blue-500'
                  )}>
                    {rule.risk}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", rule.enabled ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-600")}></div>
                    <span className="text-[11px] font-bold text-slate-400">{rule.enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-[#00ffff] transition-all">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
