'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Users, Brain, BarChart3, AlertOctagon } from 'lucide-react';

interface SidebarProps {
  agentPaused: boolean;
  onTogglePause: () => void;
  connectionStatus?: string;
  onOpenQrModal?: () => void;
}

export function Sidebar({ agentPaused, onTogglePause, connectionStatus, onOpenQrModal }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Bandeja de Entrada', icon: MessageSquare },
    { href: '/leads', label: 'Pipeline de Leads', icon: Users },
    { href: '/brain', label: 'Cerebro IA SerStorm', icon: Brain },
    { href: '/metrics', label: 'Métricas & Conversión', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 h-screen">
      <div>
        <div className="flex items-center space-x-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            S
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 tracking-wide">SerStorm</h1>
            <p className="text-xs text-indigo-400 font-medium">Turismo Marketing CRM</p>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-2">
        {connectionStatus === 'qr_pending' && onOpenQrModal && (
          <button
            type="button"
            onClick={onOpenQrModal}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all shadow-md shadow-amber-500/10"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>📱 Escanear QR WhatsApp</span>
          </button>
        )}

        {connectionStatus === 'connected' && (
          <div className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>WhatsApp Activo (24/7)</span>
          </div>
        )}

        <button
          onClick={onTogglePause}
          className={`w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            agentPaused
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>{agentPaused ? '▶ Reactivar Agente' : '⏸ Pausar Agente (Freno)'}</span>
        </button>
      </div>
    </aside>
  );
}
