import React, { useState } from 'react';
import { Copy, Check, Server, Database, ShieldAlert, Key, Terminal, ArrowRight, Code } from 'lucide-react';
import { SERVER_JS_SNIPPET, SCHEMA_SQL } from '../data/extensionCode';
import { VipThresholdConfig } from './VipThresholdConfig';
import { ChromeDesktopNotificationsConfig } from './ChromeDesktopNotificationsConfig';
import { AutomationRulesConfig } from './AutomationRulesConfig';
import { SoundAlertsConfig } from './SoundAlertsConfig';

export const BackendIntegrationView: React.FC = () => {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const curlExample = `curl -X POST https://glowbby.online/v1/bot/event \\
  -H "Authorization: Bearer glw_sec_89dfa47b19283f" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "tip",
    "model": "alexa_star",
    "timestamp": "2026-09-07T10:00:00Z",
    "data": {
      "tipper": "Marco_VIP",
      "tokens": 100,
      "message": "Love your energy!",
      "isVip": true
    }
  }'`;

  return (
    <div id="backend-integration-container" className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Server className="w-4 h-4" />
              <span>Integrare Backend Node.js / Express + better-sqlite3</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Gata de Adăugat în fișierul tău existent <code className="text-pink-400 font-mono text-lg">server.js</code>
            </h2>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
              Endpoint securizat <code className="text-slate-200 font-mono">POST /v1/bot/event</code> cu validare Bearer Token, 
              suport pentru evenimente individuale și batch-uri de sincronizare, stocare în tranzacții atomice SQLite și actualizare în timp real a clasamentului de suporteri.
            </p>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(SERVER_JS_SNIPPET);
              setCopiedSnippet(true);
              setTimeout(() => setCopiedSnippet(false), 2500);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
          >
            {copiedSnippet ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copiat în Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiază Codul pentru server.js</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3 Steps Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase mb-2">
            <span className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center text-[11px]">1</span>
            <span>Verificare Pachete</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Asigură-te că ai instalate pachetele <code className="text-slate-200 font-mono">express</code> și <code className="text-slate-200 font-mono">better-sqlite3</code> în proiectul tău:
          </p>
          <div className="bg-slate-950 p-2 rounded font-mono text-[11px] text-emerald-400 border border-slate-800">
            npm install better-sqlite3 express
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase mb-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[11px]">2</span>
            <span>Lipire în server.js</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Lipește blocul de cod furnizat mai jos în fișierul tău <code className="text-slate-200 font-mono">server.js</code>. 
            Tabelele SQLite, indexurile și token-ul demo inițial se creează automat la pornire!
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">3</span>
            <span>Generare Bot Token</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fiecare model primește un token unic inserat în tabela <code className="text-slate-200 font-mono">bot_tokens</code>. 
            Modelul introduce acest token o singură dată în extensia Chrome.
          </p>
        </div>
      </div>

      {/* VIP Thresholds & Push Notification Automation Section */}
      <VipThresholdConfig />

      {/* Automation Rules (Auto-Reply Chat for specific messages in SQLite rules table) */}
      <AutomationRulesConfig />

      {/* Sound Alerts (Custom Audio Triggers for Tips & VIPs) */}
      <SoundAlertsConfig />

      {/* Chrome Desktop Notifications Custom Thresholds Panel */}
      <ChromeDesktopNotificationsConfig />

      {/* Code Snippet Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
            <Code className="w-4 h-4 text-orange-400" />
            <span>Codul Complet de Adăugat în server.js</span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(SERVER_JS_SNIPPET);
              setCopiedSnippet(true);
              setTimeout(() => setCopiedSnippet(false), 2500);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSnippet ? 'Copiat!' : 'Copiază'}</span>
          </button>
        </div>
        <div className="p-4 max-h-[480px] overflow-auto text-xs font-mono text-slate-300 leading-relaxed bg-[#0a0c12]">
          <pre className="whitespace-pre overflow-x-auto">
            <code>{SERVER_JS_SNIPPET}</code>
          </pre>
        </div>
      </div>

      {/* SQLite Tables & Test Request Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SQLite Schema */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase">
              <Database className="w-4 h-4" />
              <span>Structură Bază de Date SQLite</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SCHEMA_SQL);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2500);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiat' : 'Copiază SQL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Optimizat cu <code className="text-cyan-300 font-mono">PRAGMA journal_mode = WAL</code> pentru citire și scriere concurentă fără blocaje în timpul spectacolelor live cu volum mare de tips.
          </p>
          <div className="flex-1 bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-auto max-h-[220px]">
            <pre className="whitespace-pre">
              <code>{SCHEMA_SQL}</code>
            </pre>
          </div>
        </div>

        {/* cURL & Testing */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
              <Terminal className="w-4 h-4" />
              <span>Testare Rapidă prin cURL</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(curlExample);
                setCopiedCurl(true);
                setTimeout(() => setCopiedCurl(false), 2500);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCurl ? 'Copiat' : 'Copiază cURL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Poți rula comanda direct în terminal pentru a verifica dacă endpoint-ul tău răspunde cu <code className="text-emerald-300 font-mono">HTTP 200 OK</code> și salvează evenimentul.
          </p>
          <div className="flex-1 bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-emerald-400/90 overflow-auto max-h-[220px]">
            <pre className="whitespace-pre">
              <code>{curlExample}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
