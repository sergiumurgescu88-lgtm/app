import React, { useState } from 'react';
import { 
  MANIFEST_JSON, 
  BACKGROUND_JS, 
  CONTENT_JS, 
  POPUP_HTML, 
  POPUP_JS, 
  SERVER_JS_SNIPPET, 
  SCHEMA_SQL 
} from '../data/extensionCode';
import { Copy, Check, FileCode, Server, Database, Sparkles, Terminal } from 'lucide-react';

interface FileTab {
  id: string;
  name: string;
  lang: string;
  badge: string;
  icon: React.ReactNode;
  content: string;
  description: string;
}

export const CodeViewer: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const files: FileTab[] = [
    {
      id: 'manifest',
      name: 'manifest.json',
      lang: 'json',
      badge: 'Manifest V3',
      icon: <FileCode className="w-4 h-4 text-pink-400" />,
      content: MANIFEST_JSON,
      description: 'Configurația oficială Chrome Manifest V3 cu permisiuni minime securizate (storage, activeTab, scripting).'
    },
    {
      id: 'background',
      name: 'background.js',
      lang: 'javascript',
      badge: 'Service Worker',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      content: BACKGROUND_JS,
      description: 'Service Worker cu coadă persistentă în chrome.storage, backoff exponențial și retry logic la căderi de rețea.'
    },
    {
      id: 'content',
      name: 'content.js',
      lang: 'javascript',
      badge: 'DOM Observer',
      icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
      content: CONTENT_JS,
      description: 'Observă #chat_text_list prin MutationObserver (fără chrome.debugger), detectează tip-uri, VIP, auto-welcome și mulțumiri automate.'
    },
    {
      id: 'popup_html',
      name: 'popup.html',
      lang: 'html',
      badge: 'UI Popup',
      icon: <FileCode className="w-4 h-4 text-blue-400" />,
      content: POPUP_HTML,
      description: 'Interfață elegantă și compactă pentru introducerea Bot Token-ului, backend URL și comutatoarelor de automatizare.'
    },
    {
      id: 'popup_js',
      name: 'popup.js',
      lang: 'javascript',
      badge: 'UI Controller',
      icon: <FileCode className="w-4 h-4 text-purple-400" />,
      content: POPUP_JS,
      description: 'Logică de salvare a token-ului în chrome.storage.local, testare conexiune live și afișare stare coadă.'
    },
    {
      id: 'server_js',
      name: 'server.js (Node.js Backend)',
      lang: 'javascript',
      badge: 'Express + SQLite',
      icon: <Server className="w-4 h-4 text-orange-400" />,
      content: SERVER_JS_SNIPPET,
      description: 'Cod gata de copy-paste în fișierul tău existent server.js cu endpoint-ul POST /v1/bot/event, Bearer auth și better-sqlite3.'
    },
    {
      id: 'schema_sql',
      name: 'schema.sql',
      lang: 'sql',
      badge: 'Database Schema',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      content: SCHEMA_SQL,
      description: 'Schema tabelelor SQLite: bot_tokens, bot_events, tipper_stats cu mod WAL și indexuri optimizate.'
    }
  ];

  const [activeTab, setActiveTab] = useState<string>(files[0].id);
  const currentFile = files.find(f => f.id === activeTab) || files[0];

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const lineCount = currentFile.content.split('\n').length;
  const byteSize = new Blob([currentFile.content]).size;
  const formattedSize = byteSize > 1024 ? (byteSize / 1024).toFixed(1) + ' KB' : byteSize + ' B';

  return (
    <div id="code-viewer-container" className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
      {/* File Selection Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-900/90 border-b border-slate-800 overflow-x-auto">
        {files.map((file) => {
          const isActive = file.id === activeTab;
          return (
            <button
              key={file.id}
              id={`tab-btn-${file.id}`}
              onClick={() => setActiveTab(file.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {file.icon}
              <span>{file.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isActive ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {file.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* File Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/50 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-300 font-semibold">{currentFile.name}</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="text-slate-400 hidden sm:inline">{currentFile.description}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[11px] text-slate-500">{lineCount} linii</span>
          <span className="font-mono text-[11px] text-slate-500">{formattedSize}</span>
          <button
            id={`copy-code-btn-${currentFile.id}`}
            onClick={() => handleCopy(currentFile.content, currentFile.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 hover:text-pink-200 transition-colors font-medium text-xs cursor-pointer"
          >
            {copiedId === currentFile.id ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiat!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiază Codul</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative max-h-[580px] overflow-auto bg-[#0a0c12] p-4 text-slate-200 font-mono text-[13px] leading-relaxed select-text">
        <pre className="overflow-x-auto whitespace-pre">
          <code>{currentFile.content}</code>
        </pre>
      </div>
    </div>
  );
};
