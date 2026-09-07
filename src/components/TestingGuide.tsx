import React, { useState } from 'react';
import { 
  Download, 
  FolderCheck, 
  Settings, 
  PlayCircle, 
  HelpCircle, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { downloadExtensionZip } from '../utils/generateZip';

export const TestingGuide: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  const steps = [
    {
      step: '1',
      title: 'Descarcă Pachetul Extensiei (.ZIP)',
      desc: 'Apasă butonul de descărcare de mai jos. Vei primi o arhivă completă conținând manifest.json, background.js, content.js, popup.html, popup.js și setul de iconițe generate automat.',
      icon: <Download className="w-5 h-5 text-pink-400" />
    },
    {
      step: '2',
      title: 'Dezarhivează fișierele într-un Folder',
      desc: 'Extrage arhiva ZIP într-un folder local accesibil (de exemplu: C:\\GlowBot-Extension sau ~/Desktop/GlowBot-Extension). Folderul trebuie să conțină direct fișierul manifest.json.',
      icon: <FolderCheck className="w-5 h-5 text-indigo-400" />
    },
    {
      step: '3',
      title: 'Deschide chrome://extensions în Google Chrome',
      desc: 'Deschide o filă nouă în Chrome și scrie în bara de adrese: chrome://extensions/. Asigură-te că activezi comutatorul "Developer mode" (Modul pentru dezvoltatori) din colțul din dreapta-sus.',
      icon: <Settings className="w-5 h-5 text-amber-400" />
    },
    {
      step: '4',
      title: 'Apasă "Load unpacked" (Încarcă despachetat)',
      desc: 'Dă click pe butonul "Load unpacked" din stânga-sus și selectează folderul unde ai dezarhivat extensia. GlowBot va apărea instant în lista ta de extensii active!',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    },
    {
      step: '5',
      title: 'Configurează Bot Token-ul în Popup',
      desc: 'Dă click pe iconița GlowBot din bara Chrome (poți folosi "Pin"). Introdu Bot Token-ul generat pe serverul tău și URL-ul către endpoint-ul backend (ex: https://glowbby.online/v1/bot/event sau http://localhost:3000/v1/bot/event).',
      icon: <PlayCircle className="w-5 h-5 text-cyan-400" />
    }
  ];

  return (
    <div id="testing-guide-container" className="space-y-6">
      {/* Hero Action Card */}
      <div className="bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/30 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-pink-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Pachet Gata de Instalare</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Descarcă Extensia Chrome (Manifest V3)
          </h2>
          <p className="text-slate-300 text-xs mt-1.5 max-w-xl leading-relaxed">
            Arhiva include toate cele 6 fișiere gata structurate + iconițele rezoluție 16x16, 48x48, 128x128. 
            Poate fi încărcată direct în Google Chrome sau Brave prin meniul Developer Mode.
          </p>
        </div>

        <button
          id="btn-download-zip"
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Se generează arhiva...' : '📦 Descarcă Extensia (.ZIP)'}</span>
        </button>
      </div>

      {/* 5 Steps Visual Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((s, idx) => (
          <div 
            key={s.step} 
            className={`bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden ${
              idx === 4 ? 'md:col-span-2 lg:col-span-1' : ''
            }`}
          >
            <div className="absolute top-2 right-3 font-mono font-black text-3xl text-slate-800 select-none">
              0{s.step}
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  {s.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-100">{s.title}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {s.desc}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Pasul {s.step} din 5</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </div>
          </div>
        ))}
      </div>

      {/* Pro Tips & Debugging */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Sfaturi Profesionale pentru Depanare & Verificare Live</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Inspectare Service Worker (Background Log)
            </div>
            <p className="text-slate-400 leading-relaxed">
              În <code className="text-slate-300 font-mono">chrome://extensions</code>, sub GlowBot, dă click pe linkul albastru 
              <strong> "service worker"</strong>. Aceasta va deschide DevTools dedicat pentru background.js, unde poți vedea fiecare request, log de retry și confirmare a cozii!
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-400"></span>
              Inspectare DOM & Chat pe Chaturbate
            </div>
            <p className="text-slate-400 leading-relaxed">
              Pe pagina modelului, deschide consola apăsând <strong>F12</strong> sau Click Dreapta -&gt; Inspect. 
              Filtrează mesajele din consolă după <code className="text-pink-300 font-mono">[GlowBot]</code> pentru a vedea cum MutationObserver detectează tip-urile și badge-urile în timp real.
            </p>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200">Notă privind permisiunile CORS:</strong> 
            Datorită faptului că am adăugat domeniul tău de backend (<code className="text-amber-300 font-mono">https://glowbby.online/*</code>) 
            și <code className="text-amber-300 font-mono">http://localhost:*/*</code> în secțiunea <code className="text-amber-300 font-mono">host_permissions</code> din manifest.json, 
            apelurile <code className="text-slate-300 font-mono">fetch</code> efectuate din Service Worker nu sunt blocate de CORS!
          </div>
        </div>
      </div>
    </div>
  );
};
