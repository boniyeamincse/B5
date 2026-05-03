"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShieldCheck, Activity, Settings, Globe, Lock,
  List, Server, FileCode, ShieldAlert, Fingerprint, Zap, UserCheck,
  History, BarChart3, FileText, Users, ChevronDown, ChevronRight,
  Shield, AlertTriangle, BarChart2, Database, Network, Clock, MapPin,
  Eye, Download, Cpu, BookOpen, Key, LogIn, ClipboardList, Upload, Bot,
  CodeSquare, CheckSquare, XCircle, RefreshCw, Layers, TrendingUp, Gauge,
  Wifi, Mail, HardDrive, Info, Book, Wrench, ServerCrash, Search, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem { icon: React.ElementType; label: string; href: string }
interface MenuCategory { title: string; items: MenuItem[] }

const menu: MenuCategory[] = [
  {
    title: 'DASHBOARD',
    items: [
      { icon: LayoutDashboard, label: 'Overview',         href: '/dashboard' },
      { icon: ShieldAlert,     label: 'Security Summary', href: '/dashboard/security-summary' },
      { icon: Activity,        label: 'Traffic Summary',  href: '/dashboard/traffic-summary' },
      { icon: Zap,             label: 'Active Alarms',    href: '/dashboard/alarms' },
      { icon: UserCheck,       label: 'System Health',    href: '/dashboard/health' },
    ],
  },
  {
    title: 'APPLICATION MANAGEMENT',
    items: [
      { icon: Globe,       label: 'Applications',           href: '/dashboard/apps' },
      { icon: Server,      label: 'Backend Servers',        href: '/dashboard/servers' },
      { icon: Layers,      label: 'Backend Pools',          href: '/dashboard/pools' },
      { icon: Network,     label: 'Virtual Hosts',          href: '/dashboard/vhosts' },
      { icon: Lock,        label: 'TLS / SSL Certificates', href: '/dashboard/certs' },
      { icon: CheckSquare, label: 'Deployment Status',      href: '/dashboard/deployment' },
    ],
  },
  {
    title: 'WAF POLICY MANAGEMENT',
    items: [
      { icon: ShieldCheck, label: 'Security Policies',   href: '/dashboard/policies' },
      { icon: FileCode,    label: 'Policy Templates',    href: '/dashboard/policy-templates' },
      { icon: Eye,         label: 'Learning Mode',       href: '/dashboard/learning' },
      { icon: FileText,    label: 'Logging Mode',        href: '/dashboard/logging-mode' },
      { icon: XCircle,     label: 'Blocking Mode',       href: '/dashboard/blocking-mode' },
      { icon: RefreshCw,   label: 'Policy Suggestions',  href: '/dashboard/policy-suggestions' },
      { icon: History,     label: 'Policy Versions',     href: '/dashboard/policy-versions' },
    ],
  },
  {
    title: 'RULE MANAGEMENT',
    items: [
      { icon: Fingerprint,   label: 'Attack Signatures', href: '/dashboard/signatures' },
      { icon: FileCode,      label: 'Custom Rules',      href: '/dashboard/rules' },
      { icon: List,          label: 'Rule Groups',       href: '/dashboard/rule-groups' },
      { icon: CheckSquare,   label: 'Allowlist Rules',   href: '/dashboard/allowlist' },
      { icon: XCircle,       label: 'Blocklist Rules',   href: '/dashboard/blocklist' },
      { icon: AlertTriangle, label: 'Rule Exceptions',   href: '/dashboard/exceptions' },
      { icon: Wrench,        label: 'Rule Testing',      href: '/dashboard/rule-testing' },
    ],
  },
  {
    title: 'THREAT PROTECTION',
    items: [
      { icon: Shield,      label: 'OWASP Top 10',              href: '/dashboard/owasp' },
      { icon: Database,    label: 'SQL Injection Protection',  href: '/dashboard/sqli' },
      { icon: CodeSquare,  label: 'XSS Protection',            href: '/dashboard/xss' },
      { icon: ServerCrash, label: 'Command Injection',         href: '/dashboard/cmdi' },
      { icon: Search,      label: 'Path Traversal',            href: '/dashboard/path-traversal' },
      { icon: Upload,      label: 'File Upload Protection',    href: '/dashboard/file-upload' },
      { icon: Zap,         label: 'API Abuse Protection',      href: '/dashboard/api-abuse' },
      { icon: Bot,         label: 'Bot Protection',            href: '/dashboard/bot-protection' },
    ],
  },
  {
    title: 'API SECURITY',
    items: [
      { icon: Globe,         label: 'API Inventory',      href: '/dashboard/api-inventory' },
      { icon: Network,       label: 'API Endpoints',      href: '/dashboard/api-endpoints' },
      { icon: FileCode,      label: 'JSON Inspection',    href: '/dashboard/json-inspection' },
      { icon: ClipboardList, label: 'Schema Validation',  href: '/dashboard/schema-validation' },
      { icon: Key,           label: 'Token Abuse',        href: '/dashboard/token-abuse' },
      { icon: CheckSquare,   label: 'Method Enforcement', href: '/dashboard/method-enforcement' },
      { icon: Gauge,         label: 'API Rate Limits',    href: '/dashboard/api-rate-limits' },
    ],
  },
  {
    title: 'RATE LIMITING',
    items: [
      { icon: BarChart3,   label: 'Global Rate Limits',  href: '/dashboard/rate-limits' },
      { icon: MapPin,      label: 'Per-IP Rate Limits',  href: '/dashboard/ip-rate-limits' },
      { icon: Network,     label: 'Per-Route Limits',    href: '/dashboard/route-rate-limits' },
      { icon: Lock,        label: 'Login Protection',    href: '/dashboard/login-protection' },
      { icon: ShieldAlert, label: 'Brute Force Rules',   href: '/dashboard/brute-force' },
      { icon: Clock,       label: 'Temporary Blocks',    href: '/dashboard/temp-blocks' },
    ],
  },
  {
    title: 'IP REPUTATION',
    items: [
      { icon: XCircle,       label: 'IP Blocklist',      href: '/dashboard/ip-blocklist' },
      { icon: CheckSquare,   label: 'IP Allowlist',      href: '/dashboard/ip-allowlist' },
      { icon: TrendingUp,    label: 'Reputation Scores', href: '/dashboard/reputation' },
      { icon: MapPin,        label: 'Geo Blocking',      href: '/dashboard/geo-blocking' },
      { icon: AlertTriangle, label: 'Suspicious IPs',    href: '/dashboard/suspicious-ips' },
      { icon: Clock,         label: 'Temporary IP Bans', href: '/dashboard/ip-bans' },
    ],
  },
  {
    title: 'SECURITY EVENTS',
    items: [
      { icon: History,       label: 'Event Logs',        href: '/dashboard/events' },
      { icon: XCircle,       label: 'Blocked Requests',  href: '/dashboard/blocked' },
      { icon: CheckSquare,   label: 'Allowed Requests',  href: '/dashboard/allowed' },
      { icon: AlertTriangle, label: 'High Risk Events',  href: '/dashboard/high-risk' },
      { icon: Clock,         label: 'Attack Timeline',   href: '/dashboard/timeline' },
      { icon: Search,        label: 'Forensics',         href: '/dashboard/forensics' },
      { icon: Download,      label: 'Export Logs',       href: '/dashboard/export' },
    ],
  },
  {
    title: 'MONITORING',
    items: [
      { icon: Wifi,          label: 'Live Traffic',      href: '/dashboard/live-traffic' },
      { icon: BarChart2,     label: 'Request Analytics', href: '/dashboard/analytics' },
      { icon: Server,        label: 'Backend Health',    href: '/dashboard/backend-health' },
      { icon: Gauge,         label: 'Latency Monitor',   href: '/dashboard/latency' },
      { icon: AlertTriangle, label: 'Error Rates',       href: '/dashboard/error-rates' },
      { icon: Globe,         label: 'Top URLs',          href: '/dashboard/top-urls' },
      { icon: ShieldAlert,   label: 'Top Attackers',     href: '/dashboard/top-attackers' },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { icon: FileText,      label: 'Daily Report',      href: '/dashboard/report-daily' },
      { icon: FileText,      label: 'Weekly Report',     href: '/dashboard/report-weekly' },
      { icon: FileText,      label: 'Monthly Report',    href: '/dashboard/report-monthly' },
      { icon: ClipboardList, label: 'Compliance Report', href: '/dashboard/report-compliance' },
      { icon: Shield,        label: 'OWASP Report',      href: '/dashboard/report-owasp' },
      { icon: Settings,      label: 'Custom Reports',    href: '/dashboard/report-custom' },
    ],
  },
  {
    title: 'SYSTEM SETTINGS',
    items: [
      { icon: Settings,  label: 'General Settings',  href: '/dashboard/settings' },
      { icon: Network,   label: 'Network Settings',  href: '/dashboard/settings/network' },
      { icon: Cpu,       label: 'Proxy Settings',    href: '/dashboard/settings/proxy' },
      { icon: FileText,  label: 'Logging Settings',  href: '/dashboard/settings/logging' },
      { icon: Bell,      label: 'Notifications',     href: '/dashboard/settings/notifications' },
      { icon: Mail,      label: 'Email / SMTP',      href: '/dashboard/settings/smtp' },
      { icon: HardDrive, label: 'Backup & Restore',  href: '/dashboard/settings/backup' },
      { icon: Info,      label: 'License / Version', href: '/dashboard/settings/license' },
    ],
  },
  {
    title: 'USER MANAGEMENT',
    items: [
      { icon: Users,         label: 'Admin Users',          href: '/dashboard/users' },
      { icon: Key,           label: 'Roles & Permissions',  href: '/dashboard/roles' },
      { icon: Shield,        label: 'API Tokens',           href: '/dashboard/api-tokens' },
      { icon: LogIn,         label: 'Login Sessions',       href: '/dashboard/sessions' },
      { icon: ClipboardList, label: 'Audit Logs',           href: '/dashboard/audit-logs' },
    ],
  },
  {
    title: 'HELP',
    items: [
      { icon: Book,     label: 'Documentation',   href: '/dashboard/docs' },
      { icon: BookOpen, label: 'Setup Guide',     href: '/dashboard/setup' },
      { icon: FileCode, label: 'API Reference',   href: '/dashboard/api-reference' },
      { icon: Wrench,   label: 'Troubleshooting', href: '/dashboard/troubleshooting' },
      { icon: Info,     label: 'About B5',        href: '/dashboard/about' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(['DASHBOARD']);

  const toggle = (title: string) =>
    setExpanded(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title],
    );

  return (
    <div className="w-72 h-screen glass border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 overflow-hidden">
      {/* Logo */}
      <div className="px-6 py-5 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#00ffff] to-[#38bdf8] rounded-xl flex items-center justify-center glow-cyan shrink-0">
            <Shield className="w-5 h-5 text-[#0f172a]" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              B5<span className="text-[#00ffff]">WAF</span>
            </span>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-none mt-0.5">
              Web Application Firewall
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto custom-scrollbar">
        {menu.map((cat) => {
          const isOpen = expanded.includes(cat.title);
          return (
            <div key={cat.title}>
              <button
                onClick={() => toggle(cat.title)}
                className="w-full flex items-center justify-between px-2 py-1.5 mt-3 text-[9px] font-black text-slate-500 tracking-widest uppercase hover:text-slate-300 transition-colors rounded-lg"
              >
                {cat.title}
                {isOpen
                  ? <ChevronDown className="w-3 h-3 shrink-0" />
                  : <ChevronRight className="w-3 h-3 shrink-0" />}
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {cat.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all group',
                          active
                            ? 'bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/10'
                            : 'text-slate-400 hover:text-white hover:bg-white/5',
                        )}
                      >
                        <item.icon
                          className={cn(
                            'w-3.5 h-3.5 shrink-0',
                            active
                              ? 'text-[#00ffff]'
                              : 'text-slate-500 group-hover:text-slate-300',
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {active && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00ffff] shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/15">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-[10px] text-green-400 font-semibold">WAF Active — Blocking Mode</span>
        </div>
      </div>
    </div>
  );
}
