import React from 'react';
import {
  ShieldAlert, Activity, CheckCircle2, TrendingUp, Zap, Globe,
  AlertTriangle, Clock, ArrowUpRight, ArrowDownRight, Shield, Users,
} from 'lucide-react';

const stats = [
  { label: 'Total Requests', value: '1,284,921', trend: '+5.2%', up: true,  icon: Activity,    color: 'text-blue-400',   bg: 'bg-blue-500/10'  },
  { label: 'Threats Blocked', value: '12,842',   trend: '+12%',  up: true,  icon: ShieldAlert, color: 'text-red-400',    bg: 'bg-red-500/10'   },
  { label: 'Active Rules',    value: '45',        trend: 'Stable',up: null,  icon: Shield,      color: 'text-[#00ffff]',  bg: 'bg-[#00ffff]/10' },
  { label: 'System Health',   value: '99.9%',     trend: '+0.1%', up: true,  icon: CheckCircle2,color: 'text-green-400',  bg: 'bg-green-500/10' },
];

const attackBreakdown = [
  { type: 'SQL Injection',     count: 4281, pct: 33, color: 'bg-red-500' },
  { type: 'XSS',              count: 3104, pct: 24, color: 'bg-orange-500' },
  { type: 'Path Traversal',   count: 2190, pct: 17, color: 'bg-yellow-500' },
  { type: 'Command Injection', count: 1540, pct: 12, color: 'bg-purple-500' },
  { type: 'Bot / Scraping',   count: 1050, pct: 8,  color: 'bg-blue-500' },
  { type: 'Other',            count:  677, pct: 5,  color: 'bg-slate-500' },
];

const recentEvents = [
  { ip: '45.12.33.19',    type: 'SQL Injection',      severity: 'CRITICAL', time: '1m ago',  rule: 'sqli-001' },
  { ip: '192.168.1.105',  type: 'XSS Attempt',        severity: 'HIGH',     time: '3m ago',  rule: 'xss-012' },
  { ip: '103.44.12.8',    type: 'Path Traversal',     severity: 'HIGH',     time: '7m ago',  rule: 'path-003' },
  { ip: '77.88.55.77',    type: 'Rate Limit Exceeded',severity: 'MEDIUM',   time: '12m ago', rule: 'rl-global' },
  { ip: '198.51.100.22',  type: 'Command Injection',  severity: 'CRITICAL', time: '18m ago', rule: 'cmdi-002' },
  { ip: '10.0.0.42',      type: 'Bot Detected',       severity: 'LOW',      time: '25m ago', rule: 'bot-001' },
];

const topAttackers = [
  { ip: '45.12.33.19',   country: 'CN', hits: 1842, risk: 94 },
  { ip: '192.168.1.105', country: 'RU', hits: 1234, risk: 87 },
  { ip: '198.51.100.22', country: 'US', hits:  891, risk: 72 },
  { ip: '77.88.55.77',   country: 'DE', hits:  654, risk: 61 },
];

const sevColor: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  HIGH:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MEDIUM:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  LOW:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function DashboardOverview() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Security <span className="text-[#00ffff]">Overview</span>
          </h1>
          <p className="text-slate-400 mt-1">Real-time WAF status and threat intelligence monitoring.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-green-400 font-semibold">Blocking Mode Active</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              {s.up !== null ? (
                <span className={`flex items-center gap-1 text-xs font-bold ${s.up ? 'text-green-400' : 'text-red-400'}`}>
                  {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.trend}
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-500">{s.trend}</span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-3xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attack breakdown */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Attack Type <span className="text-[#00ffff]">Breakdown</span></h2>
            <span className="text-xs text-slate-500 font-medium">Last 24 hours</span>
          </div>
          <div className="space-y-4">
            {attackBreakdown.map((a) => (
              <div key={a.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-medium">{a.type}</span>
                  <span className="text-slate-400 font-mono text-xs">{a.count.toLocaleString()} <span className="text-slate-600">({a.pct}%)</span></span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full ${a.color} rounded-full transition-all`} style={{ width: `${a.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top attackers */}
        <div className="glass rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Top <span className="text-[#00ffff]">Attackers</span></h2>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="space-y-3">
            {topAttackers.map((a, i) => (
              <div key={a.ip} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <span className="text-xs font-black text-slate-600 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-slate-200 truncate">{a.ip}</p>
                  <p className="text-[10px] text-slate-500">{a.hits} hits · {a.country}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold ${a.risk >= 80 ? 'text-red-400' : a.risk >= 60 ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {a.risk}
                  </span>
                  <p className="text-[9px] text-slate-600 uppercase">risk</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Recent <span className="text-[#00ffff]">Security Events</span></h2>
          <a href="/dashboard/events" className="flex items-center gap-1 text-xs text-[#00ffff] hover:text-white transition-colors font-medium">
            View all <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Source IP', 'Attack Type', 'Severity', 'Rule', 'Time'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <td className="px-6 py-3 font-mono text-slate-200 text-xs">{e.ip}</td>
                  <td className="px-6 py-3 text-slate-300 text-xs">{e.type}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${sevColor[e.severity]}`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-slate-500 text-xs">{e.rule}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{e.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
