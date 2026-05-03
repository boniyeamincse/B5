"use client";

import React from 'react';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Globe, 
  Cpu,
  BarChart3
} from 'lucide-react';

export default function TrafficSummary() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight">Traffic <span className="text-[#00ffff]">Summary</span></h2>
        <p className="text-slate-500 mt-1">Global request distribution and throughput monitoring.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Inbound', value: '4.2 TB', trend: '+18%', icon: ArrowUpRight, color: 'text-green-500' },
          { label: 'Total Outbound', value: '1.8 TB', trend: '+12%', icon: ArrowDownRight, color: 'text-[#00ffff]' },
          { label: 'Avg Latency', value: '12ms', trend: '-2ms', icon: Activity, color: 'text-blue-500' },
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-xl">
                <BarChart3 className="w-5 h-5 text-[#00ffff]" />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${stat.color}`}>
                <stat.icon className="w-3 h-3" />
                {stat.trend}
              </div>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-3xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6">Top <span className="text-[#00ffff]">Geographies</span></h3>
          <div className="space-y-4">
            {[
              { country: 'United States', flag: '🇺🇸', percentage: 45 },
              { country: 'Germany', flag: '🇩🇪', percentage: 22 },
              { country: 'United Kingdom', flag: '🇬🇧', percentage: 15 },
              { country: 'Singapore', flag: '🇸🇬', percentage: 10 },
              { country: 'Other', flag: '🌐', percentage: 8 },
            ].map((geo, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-2xl">{geo.flag}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">{geo.country}</span>
                    <span className="text-white">{geo.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00ffff]/50 to-[#00ffff] rounded-full glow-cyan" 
                      style={{ width: `${geo.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Request <span className="text-[#00ffff]">Protocol</span> Breakdown</h3>
            <p className="text-xs text-slate-500 mb-6">Distribution of HTTP versions and SSL/TLS protocols.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-sm font-bold text-slate-400">HTTP/2</span>
              <span className="text-sm font-black text-[#00ffff]">82.4%</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-sm font-bold text-slate-400">HTTP/1.1</span>
              <span className="text-sm font-black text-slate-300">17.6%</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-sm font-bold text-slate-400">TLS 1.3</span>
              <span className="text-sm font-black text-green-500">94.1%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
