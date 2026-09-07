import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Copy, 
  Sparkles, 
  Database, 
  Send, 
  Play, 
  RotateCcw, 
  Info,
  Terminal,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export interface ChatAutomationRule {
  id: number;
  triggerKeyword: string;
  matchType: 'exact' | 'contains' | 'startsWith' | 'regex';
  responseMessage: string;
  delaySeconds: number;
  isActive: boolean;
  minUserLevel: 'all' | 'fanclub' | 'vip' | 'mod';
  hitsCount: number;
}

const DEFAULT_RULES: ChatAutomationRule[] = [
  {
    id: 1,
    triggerKeyword: '!snap',
    matchType: 'exact',
    responseMessage: 'Snapchat-ul meu privat este disponibil pentru membrii FanClub sau donatori de 50+ tk! Scrie-mi în privat! 👻✨',
    delaySeconds: 1,
    isActive: true,
    minUserLevel: 'all',
    hitsCount: 14
  },
  {
    id: 2,
    triggerKeyword: '!insta',
    matchType: 'exact',
    responseMessage: 'Urmărește-mă pe Instagram: @glow_star_official pentru poze din culise și programul stream-urilor! 📸💖',
    delaySeconds: 1,
    isActive: true,
    minUserLevel: 'all',
    hitsCount: 28
  },
  {
    id: 3,
    triggerKeyword: 'ce muzică',
    matchType: 'contains',
    responseMessage: 'Ascultăm playlist-ul meu Chill Deep House de pe Spotify! Adaugă melodii cu un tip de 10 tk! 🎶🎧',
    delaySeconds: 2,
    isActive: true,
    minUserLevel: 'all',
    hitsCount: 9
  },
  {
    id: 4,
    triggerKeyword: '!menu',
    matchType: 'exact',
    responseMessage: '📋 TIP MENU: 25tk = Flash | 50tk = Dance | 100tk = VIP Roll & Sound Effect | 250tk = Oil Show! ❤️🔥',
    delaySeconds: 0,
    isActive: true,
    minUserLevel: 'all',
    hitsCount: 42
  }
];

export const AutomationRulesConfig: React.FC = () => {
  const [rules, setRules] = useState<ChatAutomationRule[]>(() => {
    const saved = localStorage.getItem('glowbot_automation_rules');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_RULES;
  });

  // New rule form state
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [matchType, setMatchType] = useState<'exact' | 'contains' | 'startsWith' | 'regex'>('contains');
  const [responseMessage, setResponseMessage] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(1);
  const [minUserLevel, setMinUserLevel] = useState<'all' | 'fanclub' | 'vip' | 'mod'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Simulation test state
  const [testInput, setTestInput] = useState('!snap');
  const [testUser, setTestUser] = useState('Dan_London');
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    rule?: ChatAutomationRule;
    response?: string;
    delay?: number;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    localStorage.setItem('glowbot_automation_rules', JSON.stringify(rules));
  }, [rules]);

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerKeyword.trim() || !responseMessage.trim()) return;

    if (editingId !== null) {
      setRules(prev => prev.map(r => r.id === editingId ? {
        ...r,
        triggerKeyword: triggerKeyword.trim(),
        matchType,
        responseMessage: responseMessage.trim(),
        delaySeconds,
        minUserLevel
      } : r));
      setEditingId(null);
    } else {
      const newRule: ChatAutomationRule = {
        id: Date.now(),
        triggerKeyword: triggerKeyword.trim(),
        matchType,
        responseMessage: responseMessage.trim(),
        delaySeconds,
        isActive: true,
        minUserLevel,
        hitsCount: 0
      };
      setRules(prev => [newRule, ...prev]);
    }

    // Reset form
    setTriggerKeyword('');
    setResponseMessage('');
    setDelaySeconds(1);
    setMatchType('contains');
    setMinUserLevel('all');
  };

  const handleEdit = (rule: ChatAutomationRule) => {
    setEditingId(rule.id);
    setTriggerKeyword(rule.triggerKeyword);
    setMatchType(rule.matchType);
    setResponseMessage(rule.responseMessage);
    setDelaySeconds(rule.delaySeconds);
    setMinUserLevel(rule.minUserLevel);
  };

  const handleDelete = (id: number) => {
    setRules(prev => prev.filter(r => r.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setTriggerKeyword('');
      setResponseMessage('');
    }
  };

  const handleToggleActive = (id: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleResetDefaults = () => {
    if (confirm('Resetezi toate regulile la setările inițiale demonstrative?')) {
      setRules(DEFAULT_RULES);
      localStorage.setItem('glowbot_automation_rules', JSON.stringify(DEFAULT_RULES));
    }
  };

  // Test simulation matching logic
  const handleTestMatch = () => {
    const text = testInput.trim();
    if (!text) {
      setTestResult(null);
      return;
    }

    const activeRules = rules.filter(r => r.isActive);
    let matchedRule: ChatAutomationRule | undefined;

    for (const rule of activeRules) {
      const trigger = rule.triggerKeyword.trim();
      if (rule.matchType === 'exact' && text.toLowerCase() === trigger.toLowerCase()) {
        matchedRule = rule;
        break;
      }
      if (rule.matchType === 'contains' && text.toLowerCase().includes(trigger.toLowerCase())) {
        matchedRule = rule;
        break;
      }
      if (rule.matchType === 'startsWith' && text.toLowerCase().startsWith(trigger.toLowerCase())) {
        matchedRule = rule;
        break;
      }
      if (rule.matchType === 'regex') {
        try {
          const regex = new RegExp(trigger, 'i');
          if (regex.test(text)) {
            matchedRule = rule;
            break;
          }
        } catch (err) {
          console.warn('Invalid regex:', err);
        }
      }
    }

    if (matchedRule) {
      // Incrementează hitsCount local
      setRules(prev => prev.map(r => r.id === matchedRule!.id ? { ...r, hitsCount: r.hitsCount + 1 } : r));

      const response = matchedRule.responseMessage
        .replace(/{user}/g, testUser)
        .replace(/{trigger}/g, text);

      setTestResult({
        matched: true,
        rule: matchedRule,
        response,
        delay: matchedRule.delaySeconds
      });
    } else {
      setTestResult({
        matched: false
      });
    }
  };

  const rulesTableSql = `-- Tabel SQLite pentru regulile de automatizare chat (rules)
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_username TEXT NOT NULL,
  trigger_keyword TEXT NOT NULL,
  match_type TEXT DEFAULT 'contains', -- 'exact', 'contains', 'startsWith', 'regex'
  response_message TEXT NOT NULL,
  delay_seconds REAL DEFAULT 1.0,
  is_active INTEGER DEFAULT 1,
  min_user_level TEXT DEFAULT 'all', -- 'all', 'fanclub', 'vip', 'mod'
  hits_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rules_model ON rules(model_username, is_active);`;

  return (
    <div id="automation-rules-container" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600/30 to-purple-600/30 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Automation Rules (Auto-Reply Chat)</h3>
              <span className="text-[10px] font-mono bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/30 font-semibold">
                SQLite table: rules
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Configurează răspunsuri predefinite pentru mesaje sau comenzi specifice din chat-ul camerei (ex: <code className="text-pink-300 font-mono">!snap</code>, <code className="text-pink-300 font-mono">!menu</code>, întrebări frecvente).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            title="Resetează la regulile implicite"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(rulesTableSql);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2500);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'SQL Copiat!' : 'Copiază SQL'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form + Live Test Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Formular Adăugare / Editare Regulă */}
        <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <form onSubmit={handleSaveRule} className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                {editingId ? 'Editează Regula Selectată' : 'Adaugă Regulă Nouă'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setTriggerKeyword('');
                    setResponseMessage('');
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Anulează editarea
                </button>
              )}
            </div>

            {/* Keyword & Match Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Cuvânt Cheie / Comandă <span className="text-pink-400">*</span>
                </label>
                <input
                  type="text"
                  value={triggerKeyword}
                  onChange={(e) => setTriggerKeyword(e.target.value)}
                  placeholder="ex: !snap sau instagram"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Tip Potrivire (Match)
                </label>
                <select
                  value={matchType}
                  onChange={(e: any) => setMatchType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                >
                  <option value="contains">Conține (contains)</option>
                  <option value="exact">Exact (!comanda)</option>
                  <option value="startsWith">Începe cu (startsWith)</option>
                  <option value="regex">RegEx (Expresie Regulată)</option>
                </select>
              </div>
            </div>

            {/* Response Message */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Răspuns Automatizat în Chat <span className="text-pink-400">*</span>
                </label>
                <span className="text-[10px] text-slate-500">Suportă &#123;user&#125;</span>
              </div>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
                placeholder="Introdu mesajul trimis automat în camera Chaturbate..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 leading-relaxed"
                required
              />
            </div>

            {/* Delay & Min User Level */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Întârziere (secunde)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Nivel Minim Utilizator
                </label>
                <select
                  value={minUserLevel}
                  onChange={(e: any) => setMinUserLevel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                >
                  <option value="all">Toți vizitatorii</option>
                  <option value="fanclub">Doar FanClub</option>
                  <option value="vip">Doar Suporteri VIP</option>
                  <option value="mod">Doar Moderatori</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 px-4 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-pink-600/20 cursor-pointer"
            >
              {editingId ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{editingId ? 'Actualizează Regula' : 'Salvează Regula în SQLite'}</span>
            </button>
          </form>
        </div>

        {/* Live Rule Tester & Simulator */}
        <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                Simulator Live Răspuns Chat
              </span>
              <span className="text-[10px] text-slate-400">Verifică execuția regulilor active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3">
              <div className="sm:col-span-4">
                <label className="block text-[10px] text-slate-400 mb-1">Utilizator Simulat</label>
                <input
                  type="text"
                  value={testUser}
                  onChange={(e) => setTestUser(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>
              <div className="sm:col-span-8">
                <label className="block text-[10px] text-slate-400 mb-1">Mesaj trimis în Chaturbate</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTestMatch()}
                    placeholder="ex: trimite !snap sau ce muzica asculti"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestMatch}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Testează</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test Result Box */}
            {testResult !== null && (
              <div className={`p-3 rounded-lg border text-xs transition-all ${
                testResult.matched 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.matched ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-4 h-4" />
                        Regulă Declanșată: #{testResult.rule?.id} ({testResult.rule?.triggerKeyword})
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                        Delay: {testResult.delay}s
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded border border-emerald-500/20 text-slate-100 font-sans leading-relaxed">
                      <span className="text-[10px] text-pink-400 font-bold font-mono mr-1.5">[GlowBot Auto-Reply]:</span>
                      {testResult.response}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Nicio regulă activă nu s-a potrivit cu textul introdus.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick preset chips */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-400">Comenzi rapide test:</span>
            {['!snap', '!insta', 'ce muzică e asta?', '!menu'].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => {
                  setTestInput(cmd);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors cursor-pointer"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Table List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Reguli Configurate ({rules.length})
            </h4>
            <span className="text-[11px] text-slate-500">Stocate persistent în SQLite</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {rules.filter(r => r.isActive).length} active / {rules.length} total
          </span>
        </div>

        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Trigger (Cuvânt Cheie)</th>
                  <th className="py-2.5 px-3">Tip Match</th>
                  <th className="py-2.5 px-3">Răspuns Auto Chat</th>
                  <th className="py-2.5 px-3 text-center">Delay</th>
                  <th className="py-2.5 px-3 text-center">Nivel</th>
                  <th className="py-2.5 px-3 text-center">Triggered</th>
                  <th className="py-2.5 px-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500 text-xs">
                      Nu există nicio regulă configurată încă. Folosește formularul de mai sus pentru a adăuga prima regulă!
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr 
                      key={rule.id}
                      className={`hover:bg-slate-900/40 transition-colors ${!rule.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(rule.id)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                          title={rule.isActive ? 'Dezactivează regula' : 'Activează regula'}
                        >
                          {rule.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              ACTIV
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              INACTIV
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-pink-400">
                        {rule.triggerKeyword}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {rule.matchType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-[280px] truncate text-slate-200" title={rule.responseMessage}>
                        {rule.responseMessage}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                        {rule.delaySeconds}s
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {rule.minUserLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-300 font-semibold">
                        {rule.hitsCount}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(rule)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                            title="Editează regula"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rule.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer"
                            title="Șterge regula"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
