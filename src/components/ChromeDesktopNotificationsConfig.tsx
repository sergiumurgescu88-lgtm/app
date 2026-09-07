import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Monitor, 
  Volume2, 
  VolumeX, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Crown, 
  Zap, 
  Copy, 
  Code, 
  Save, 
  RotateCcw,
  Play,
  Sliders,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export interface DesktopThresholdRule {
  id: string;
  name: string;
  minTokens: number;
  enabled: boolean;
  soundEnabled: boolean;
  soundType: 'chime' | 'coin' | 'fanfare' | 'bell';
  requireInteraction: boolean; // Keep notification on screen until user clicks
  autoDismissSeconds: number;
  titleTemplate: string;
  bodyTemplate: string;
  badgeColor: string;
}

const DEFAULT_RULES: DesktopThresholdRule[] = [
  {
    id: 'rule-micro',
    name: 'Micro Tip Notifier',
    minTokens: 25,
    enabled: true,
    soundEnabled: true,
    soundType: 'coin',
    requireInteraction: false,
    autoDismissSeconds: 4,
    titleTemplate: '🪙 Tip Nou: {tokens} Tokens ({user})',
    bodyTemplate: '{user} a trimis {tokens} tk (${usd}). "{message}"',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  },
  {
    id: 'rule-medium',
    name: 'Super Supporter Alert',
    minTokens: 100,
    enabled: true,
    soundEnabled: true,
    soundType: 'chime',
    requireInteraction: false,
    autoDismissSeconds: 7,
    titleTemplate: '🌟 Super Tip: {user} a trimis {tokens} tk!',
    bodyTemplate: 'Donație consistentă de ${usd}! Mesaj din chat: "{message}"',
    badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30'
  },
  {
    id: 'rule-whale',
    name: 'VIP Whale / Mega Tip',
    minTokens: 250,
    enabled: true,
    soundEnabled: true,
    soundType: 'fanfare',
    requireInteraction: true,
    autoDismissSeconds: 15,
    titleTemplate: '👑 MEGA TIP VIP ({tokens} tk / ${usd}) de la {user}!',
    bodyTemplate: 'ATENȚIE! {user} este acum VIP de rang înalt! Deschide camera imediat.',
    badgeColor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
  }
];

export const ChromeDesktopNotificationsConfig: React.FC = () => {
  const [rules, setRules] = useState<DesktopThresholdRule[]>(() => {
    try {
      const saved = localStorage.getItem('glowbot_desktop_threshold_rules');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_RULES;
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testNotificationFeedback, setTestNotificationFeedback] = useState<string | null>(null);

  // New rule form toggle
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleTokens, setNewRuleTokens] = useState(500);
  const [newRuleName, setNewRuleName] = useState('Ultra Tier Alert');
  const [newRuleSound, setNewRuleSound] = useState<'chime' | 'coin' | 'fanfare' | 'bell'>('fanfare');

  // Check browser Notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Web Audio synthesizer for desktop notification chime
  const playSoundEffect = (type: 'chime' | 'coin' | 'fanfare' | 'bell') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'coin') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'fanfare') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const start = ctx.currentTime + i * 0.09;
          gain.gain.setValueAtTime(0.18, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.35);
        });
      } else if (type === 'bell') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } else {
        // chime default
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  // Request native permission in Chrome
  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browserul tău nu suportă API-ul Web Notification.');
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setPermissionStatus(res);
      if (res === 'granted') {
        setTestNotificationFeedback('Permisiune acordată! Acum poți primi notificări native în Chrome.');
      } else if (res === 'denied') {
        setTestNotificationFeedback('Permisiunea a fost refuzată în setările Chrome.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save rules to localStorage
  const handleSaveRules = () => {
    localStorage.setItem('glowbot_desktop_threshold_rules', JSON.stringify(rules));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2200);
  };

  const handleResetRules = () => {
    setRules(DEFAULT_RULES);
    localStorage.setItem('glowbot_desktop_threshold_rules', JSON.stringify(DEFAULT_RULES));
  };

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleUpdateRuleNumber = (id: string, minTokens: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, minTokens: Math.max(1, minTokens) } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleAddRule = () => {
    const newRule: DesktopThresholdRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName || `Prag ${newRuleTokens} tk`,
      minTokens: newRuleTokens,
      enabled: true,
      soundEnabled: true,
      soundType: newRuleSound,
      requireInteraction: newRuleTokens >= 250,
      autoDismissSeconds: newRuleTokens >= 250 ? 15 : 6,
      titleTemplate: `🔔 Alertă Prag Depășit ({tokens} tk): {user}`,
      bodyTemplate: `{user} a donat {tokens} tk. Mesaj: "{message}"`,
      badgeColor: newRuleTokens >= 200 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
    };

    setRules(prev => [...prev, newRule].sort((a, b) => a.minTokens - b.minTokens));
    setIsAddingRule(false);
  };

  // Test firing a real desktop notification
  const fireTestNotification = (rule: DesktopThresholdRule) => {
    const user = 'Valentin_VIP';
    const tokens = rule.minTokens;
    const usd = (tokens * 0.05).toFixed(2);
    const message = 'Super show! Ești minunată! 💖';

    const title = rule.titleTemplate
      .replace(/{user}/g, user)
      .replace(/{tokens}/g, tokens.toString())
      .replace(/{usd}/g, usd);

    const body = rule.bodyTemplate
      .replace(/{user}/g, user)
      .replace(/{tokens}/g, tokens.toString())
      .replace(/{usd}/g, usd)
      .replace(/{message}/g, message);

    if (rule.soundEnabled) {
      playSoundEffect(rule.soundType);
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          requireInteraction: rule.requireInteraction,
          tag: `glowbot-${rule.id}`
        });

        if (!rule.requireInteraction && rule.autoDismissSeconds > 0) {
          setTimeout(() => {
            try { notif.close(); } catch (e) {}
          }, rule.autoDismissSeconds * 1000);
        }

        setTestNotificationFeedback(`Notificare desktop trimisă pentru pragul de ${tokens} tokens! Verifică ecranul OS.`);
      } catch (err: any) {
        console.warn('Notification error (probably iframe sandbox):', err);
        setTestNotificationFeedback(`Notificare simulată intern: ${title} (${body})`);
      }
    } else {
      setTestNotificationFeedback(`Notificare simulată intern (Activează permisiunea Chrome pentru banner OS): "${title}"`);
    }

    setTimeout(() => setTestNotificationFeedback(null), 4500);
  };

  // Code snippet for background.js to handle chrome.notifications
  const extensionChromeNotificationSnippet = `// === EXTENSIE CHROME (background.js) - NOTIFICĂRI DESKTOP NATIVE ===
// Necesar în manifest.json: "permissions": ["notifications", "storage"]

// 1. Praguri configurate din panoul de control
const DESKTOP_RULES = ${JSON.stringify(rules.map(r => ({
  minTokens: r.minTokens,
  enabled: r.enabled,
  sound: r.soundEnabled,
  requireInteraction: r.requireInteraction,
  title: r.titleTemplate
})), null, 2)};

// 2. Funcție afișare notificare nativă Chrome
function triggerDesktopNotification(tipEvent) {
  const tokens = parseInt(tipEvent.tokens, 10) || 0;
  
  // Găsește cea mai mare regulă depășită
  const matchedRule = [...DESKTOP_RULES]
    .filter(r => r.enabled && tokens >= r.minTokens)
    .sort((a, b) => b.minTokens - a.minTokens)[0];

  if (!matchedRule) return; // Niciun prag configurat nu a fost depășit

  const usd = (tokens * 0.05).toFixed(2);
  const notifId = 'glowbot_tip_' + Date.now();

  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: matchedRule.title
      .replace('{user}', tipEvent.tipper)
      .replace('{tokens}', tokens)
      .replace('{usd}', usd),
    message: \`Donator: \${tipEvent.tipper} | Sumă: \${tokens} tk ($\${usd})\\n"\${tipEvent.message || 'Fără mesaj'}"\`,
    priority: tokens >= 200 ? 2 : 1,
    requireInteraction: matchedRule.requireInteraction
  });
}

// 3. Listener apelat la recepționarea evenimentului de tip din Chaturbate
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TIP_EVENT_CAPTURED') {
    triggerDesktopNotification(message.payload);
  }
});`;

  return (
    <div id="chrome-desktop-notifications-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Monitor className="w-4 h-4" />
            <span>Notificări Desktop Native Chrome</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Configurare Praguri de Tipuri pentru Alerte Desktop
          </h3>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl">
            Primește alerte vizuale native (bannere Windows / macOS) direct pe ecranul calculatorului prin browserul Chrome atunci când spectatorii depășesc pragurile stabilite de token-uri.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetRules}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            title="Resetează la regulile implicite"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleSaveRules}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Salvat!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvează Pragurile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Permission Status Banner & Test Feedback */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${
            permissionStatus === 'granted' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' :
            permissionStatus === 'denied' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
          }`} />
          <div className="text-xs">
            <span className="text-slate-400">Stare Permisiune Notificări Chrome: </span>
            <strong className={`font-mono ${
              permissionStatus === 'granted' ? 'text-emerald-400' :
              permissionStatus === 'denied' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {permissionStatus === 'granted' ? 'Permis (Alerte Active pe Desktop)' :
               permissionStatus === 'denied' ? 'Blocat în Setări Browser' : 'Necesită Autorizare'}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {permissionStatus !== 'granted' && (
            <button
              onClick={requestBrowserPermission}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Autorizează Notificări Chrome
            </button>
          )}
        </div>
      </div>

      {testNotificationFeedback && (
        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{testNotificationFeedback}</span>
        </div>
      )}

      {/* Rules Table / Card Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Praguri Active ({rules.length})</span>
          </span>

          <button
            onClick={() => setIsAddingRule(!isAddingRule)}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingRule ? 'Anulează' : 'Adaugă Prag Nou'}</span>
          </button>
        </div>

        {/* Add Rule Form */}
        {isAddingRule && (
          <div className="bg-slate-950 border border-cyan-500/30 rounded-lg p-4 space-y-3">
            <div className="text-xs font-bold text-cyan-300">Definire Prag Nou Notificare Desktop</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nume Prag / Alertă</label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  placeholder="Ex: High Roller Alert"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Prag Minim (Tokens)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={newRuleTokens}
                  onChange={(e) => setNewRuleTokens(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-amber-400 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Sunet Alertă</label>
                <select
                  value={newRuleSound}
                  onChange={(e) => setNewRuleSound(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                >
                  <option value="coin">Coin (Monedă)</option>
                  <option value="chime">Chime (Melodios)</option>
                  <option value="bell">Bell (Clopoțel)</option>
                  <option value="fanfare">Fanfare (VIP Royal)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddingRule(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
              >
                Anulează
              </button>
              <button
                onClick={handleAddRule}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
              >
                Salvează Pragul
              </button>
            </div>
          </div>
        )}

        {/* Existing Threshold Rules List */}
        <div className="grid grid-cols-1 gap-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-xl p-4 transition-all ${
                rule.enabled 
                  ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700' 
                  : 'bg-slate-950/30 border-slate-850 opacity-60'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Rule info & tokens input */}
                <div className="flex items-start sm:items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule.id)}
                    className="mt-1 sm:mt-0 w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer accent-cyan-500"
                    title="Activează/Dezactivează acest prag"
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{rule.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${rule.badgeColor}`}>
                        &ge; {rule.minTokens} tk (${(rule.minTokens * 0.05).toFixed(2)})
                      </span>
                      {rule.requireInteraction && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-medium">
                          Persistent pe Ecran
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">
                      Titlu notificare: <span className="text-slate-200">"{rule.titleTemplate}"</span>
                    </div>
                  </div>
                </div>

                {/* Right: Controls (Threshold number, sound test, delete) */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                    <span className="text-[11px] text-slate-400">Prag:</span>
                    <input
                      type="number"
                      min="1"
                      value={rule.minTokens}
                      onChange={(e) => handleUpdateRuleNumber(rule.id, parseInt(e.target.value, 10) || 1)}
                      className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-cyan-400 text-right"
                    />
                    <span className="text-xs text-slate-400 font-mono">tk</span>
                  </div>

                  <button
                    onClick={() => playSoundEffect(rule.soundType)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                    title={`Ascultă sunetul: ${rule.soundType}`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => fireTestNotification(rule)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
                    title="Trimite o notificare de test pe ecranul desktop"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test Desktop</span>
                  </button>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 cursor-pointer transition-colors"
                    title="Șterge acest prag"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Snippet for chrome.notifications in Extension */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
            <Code className="w-4 h-4 text-cyan-400" />
            <span>Implementare în Extensia Chrome (background.js + manifest.json)</span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(extensionChromeNotificationSnippet);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copiat!' : 'Copiază Snippet'}</span>
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 leading-relaxed bg-[#0a0c12]">
          <code>{extensionChromeNotificationSnippet}</code>
        </pre>
      </div>
    </div>
  );
};
