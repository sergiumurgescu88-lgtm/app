import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Code2, 
  Server, 
  PlayCircle, 
  Activity, 
  BookOpen, 
  Coins, 
  Crown, 
  Zap, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { CodeViewer } from './components/CodeViewer';
import { BackendIntegrationView } from './components/BackendIntegrationView';
import { LiveSimulator } from './components/LiveSimulator';
import { EventInspector } from './components/EventInspector';
import { TestingGuide } from './components/TestingGuide';
import { AnalyticsView } from './components/AnalyticsView';
import { downloadExtensionZip } from './utils/generateZip';
import { BotEventPayload } from './types/extension';

export default function App() {
  const [activeTab, setActiveTab] = useState<'code' | 'backend' | 'simulator' | 'inspector' | 'analytics' | 'guide'>('code');
  const [isDownloading, setIsDownloading] = useState(false);

  // Global event log shared with simulator and inspector
  const [events, setEvents] = useState<BotEventPayload[]>([
    {
      id: 'demo_evt_1',
      type: 'tip',
      model: 'alexa_star',
      timestamp: new Date(Date.now() - 1000 * 180).toISOString(),
      data: {
        tipper: 'Marco_VIP',
        tokens: 100,
        message: 'Keep going, gorgeous! 🌟',
        isVip: true
      }
    },
    {
      id: 'demo_evt_2',
      type: 'chat_message',
      model: 'alexa_star',
      timestamp: new Date(Date.now() - 1000 * 120).toISOString(),
      data: {
        sender: 'sweet_heart22',
        message: 'What song is playing? 😍',
        userLevel: 'purple'
      }
    },
    {
      id: 'demo_evt_3',
      type: 'tip',
      model: 'alexa_star',
      timestamp: new Date(Date.now() - 1000 * 45).toISOString(),
      data: {
        tipper: 'Dan_London',
        tokens: 25,
        message: 'Love your dress!',
        isVip: false
      }
    }
  ]);

  const handleEventCaptured = (newEvent: BotEventPayload) => {
    setEvents(prev => [newEvent, ...prev]);
  };

  const handleClearEvents = () => {
    setEvents([]);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0c0f17]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20 border border-pink-400/30">
              <span className="font-extrabold text-white text-lg font-mono">G</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">GLOWBOT</span>
                <span className="text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded border border-pink-500/30">
                  MANIFEST V3
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 hidden sm:inline">
                  PROD-READY
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Chaturbate Private Model Assistant &amp; Express SQLite Event Bridge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="header-download-btn"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-md shadow-pink-600/20 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isDownloading ? 'Se generează...' : 'Descarcă Extensia (.ZIP)'}
              </span>
              <span className="sm:hidden">ZIP</span>
            </button>
          </div>
        </div>

        {/* Feature Pills / Subnav */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 overflow-x-auto">
          <div className="flex space-x-1 py-2">
            {[
              { id: 'code', label: 'Cod Sursă Extensie', icon: <Code2 className="w-4 h-4" />, badge: '6 Fișiere' },
              { id: 'backend', label: 'Integrare server.js', icon: <Server className="w-4 h-4" />, badge: 'better-sqlite3' },
              { id: 'simulator', label: 'Simulator Live', icon: <PlayCircle className="w-4 h-4" />, badge: 'Interactiv' },
              { id: 'inspector', label: 'Inspector Evenimente', icon: <Activity className="w-4 h-4" />, count: events.length },
              { id: 'analytics', label: 'Analytics SQLite', icon: <BarChart3 className="w-4 h-4" />, badge: 'Recharts' },
              { id: 'guide', label: 'Ghid Instalare Chrome', icon: <BookOpen className="w-4 h-4" /> }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <span className={isActive ? 'text-pink-400' : 'text-slate-500'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-pink-500/20 text-pink-300' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {typeof tab.count === 'number' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-pink-600 text-white font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Architectural Highlights Pill Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Manifest V3 &amp; Bearer Auth</div>
              <div className="text-[11px] text-slate-400">Permisiuni minime, securizat 100%</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Fără chrome.debugger</div>
              <div className="text-[11px] text-slate-400">MutationObserver stealth &amp; rapid</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Detectare VIP &amp; Auto-Thank</div>
              <div className="text-[11px] text-slate-400">Mulțumire automată &amp; Welcome</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Exponential Backoff</div>
              <div className="text-[11px] text-slate-400">Coadă offline, zero pierderi de date</div>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Views */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h1 className="text-lg font-bold text-white">Fișierele Complete ale Extensiei Chrome (Manifest V3)</h1>
                <p className="text-xs text-slate-400">
                  Fiecare modul este separat, bine comentat și respectă cerințele stricte Manifest V3 și securitate token.
                </p>
              </div>
            </div>
            <CodeViewer />
          </div>
        )}

        {activeTab === 'backend' && (
          <div className="space-y-4">
            <BackendIntegrationView />
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h2 className="text-lg font-bold text-white">Simulator Live Chaturbate &amp; Testare Flux Evenimente</h2>
                <p className="text-xs text-slate-400">
                  Testează cum detectează MutationObserver tip-urile, cum le trimite la Service Worker, auto-mulțumirea în chat și cum funcționează coada de retry când serverul pică.
                </p>
              </div>
            </div>
            <LiveSimulator onEventCaptured={handleEventCaptured} />
          </div>
        )}

        {activeTab === 'inspector' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h2 className="text-lg font-bold text-white">Inspector Evenimente &amp; Tranzacții SQLite în Timp Real</h2>
                <p className="text-xs text-slate-400">
                  Vizualizează evenimentele recepționate prin endpoint-ul <code className="text-pink-400 font-mono">POST /v1/bot/event</code>, 
                  antetele de autorizare Bearer și interogările SQLite executate.
                </p>
              </div>
            </div>
            <EventInspector events={events} onClear={handleClearEvents} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <AnalyticsView 
              events={events} 
              onSimulateTip={handleEventCaptured} 
            />
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-4">
            <TestingGuide />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0b0d13] border-t border-slate-800/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-400">GlowBot Enterprise</span> • Extensie Chrome Manifest V3 &amp; Backend Node.js
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Control 100% Privat</span>
            <span>•</span>
            <span>Zero dependențe de terți comerciali</span>
            <span>•</span>
            <span>Express + SQLite WAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
