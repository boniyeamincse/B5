import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0f172a] relative overflow-hidden">
      {/* Dynamic background element */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00ffff] opacity-10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#38bdf8] opacity-10 blur-[120px] rounded-full"></div>

      <div className="z-10 text-center max-w-3xl">
        <div className="inline-block px-4 py-1.5 mb-6 text-sm font-medium tracking-wider text-[#00ffff] uppercase bg-[#00ffff]/10 border border-[#00ffff]/20 rounded-full animate-fade-in">
          Next-Gen Security
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-white leading-tight">
          B5 <span className="text-[#00ffff] glow-text">WAF</span>
        </h1>
        
        <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-xl mx-auto">
          Intelligent Web Application Firewall designed for modern APIs and cloud infrastructure. 
          Protecting your assets before the first byte hits your server.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-4 bg-[#00ffff] text-[#0f172a] font-bold rounded-xl hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-transform">
            Enter Dashboard
          </button>
          <button className="px-8 py-4 bg-transparent border border-white/20 text-white font-bold rounded-xl hover:bg-white/5 transition-colors">
            View Live Logs
          </button>
        </div>
      </div>

      <div className="mt-20 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Real-time Requests', value: '1.2M', color: '#00ffff' },
          { label: 'Blocked Attacks', value: '45.3k', color: '#ef4444' },
          { label: 'System Health', value: '99.9%', color: '#22c55e' }
        ].map((stat, idx) => (
          <div key={idx} className="glass p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-sm uppercase tracking-widest text-slate-500 mb-2">{stat.label}</span>
            <span className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
