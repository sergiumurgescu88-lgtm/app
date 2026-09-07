import React, { useState } from 'react';
import { BotEventPayload } from '../types/extension';
import { 
  Activity, 
  Coins, 
  Crown, 
  MessageSquare, 
  RefreshCw, 
  Trash2, 
  Database, 
  Eye, 
  Code,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface EventInspectorProps {
  events: BotEventPayload[];
  onClear: () => void;
}

export const EventInspector: React.FC<EventInspectorProps> = ({ events, onClear }) => {
  const [selectedEvent, setSelectedEvent] = useState<BotEventPayload | null>(null);
  const [filter, setFilter] = useState<'all' | 'tip' | 'chat_message' | 'status_change'>('all');

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    return e.type === filter;
  });

  const totalTokens = events.reduce((sum, e) => {
    if (e.type === 'tip' && e.data.tokens) return sum + e.data.tokens;
    return sum;
  }, 0);

  const tipsCount = events.filter(e => e.type === 'tip').length;
  const vipCount = events.filter(e => e.type === 'tip' && e.data.isVip).length;

  return (
    <div id="event-inspector-container" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Event Feed & Stats (Left 7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Metric Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Total Token-uri</div>
            <div className="text-xl font-mono font-bold text-amber-400">
              {totalTokens.toLocaleString()} <span className="text-xs text-slate-500 font-sans">tk</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">≈ ${(totalTokens * 0.05).toFixed(2)} USD</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Număr Tips</div>
            <div className="text-xl font-mono font-bold text-pink-400">
              {tipsCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Înregistrate în sesiune</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Suporteri VIP</div>
            <div className="text-xl font-mono font-bold text-yellow-400">
              {vipCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">&gt;= 100 tk per tip</div>
          </div>
        </div>

        {/* Feed Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col min-h-[380px]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase">Flux Evenimente Live (POST /v1/bot/event)</span>
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {events.length} recepționate
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
                {(['all', 'tip', 'chat_message'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      filter === f ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'Toate' : f === 'tip' ? 'Doar Tips' : 'Doar Chat'}
                  </button>
                ))}
              </div>

              {events.length > 0 && (
                <button
                  onClick={onClear}
                  title="Golește lista"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Event Items List */}
          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pt-3 pr-1">
            {filteredEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 text-xs">
                <Database className="w-8 h-8 mb-2 opacity-40" />
                <span>Niciun eveniment recepționat încă.</span>
                <span className="text-[11px] text-slate-600 mt-1">
                  Apasă pe butoanele de test din tab-ul <strong>Simulator Live</strong> pentru a genera tip-uri!
                </span>
              </div>
            ) : (
              filteredEvents.map((evt, idx) => {
                const isSelected = selectedEvent?.id === evt.id;
                const isTip = evt.type === 'tip';
                const isVip = isTip && evt.data.isVip;

                return (
                  <div
                    key={evt.id || idx}
                    onClick={() => setSelectedEvent(evt)}
                    className={`p-3 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-pink-500/70 shadow-md'
                        : isVip
                        ? 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-500/30'
                        : isTip
                        ? 'bg-pink-950/20 hover:bg-pink-950/30 border-pink-500/20'
                        : 'bg-slate-950/70 hover:bg-slate-800/40 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800 shrink-0">
                        {isVip ? (
                          <Crown className="w-4 h-4 text-amber-400" />
                        ) : isTip ? (
                          <Coins className="w-4 h-4 text-pink-400" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 truncate">
                            {evt.data.tipper || evt.data.sender || 'Sistem'}
                          </span>
                          {isTip && (
                            <span className={`font-mono font-bold text-xs px-1.5 py-0.2 rounded ${
                              isVip ? 'bg-amber-500/30 text-amber-300' : 'bg-pink-500/30 text-pink-300'
                            }`}>
                              +{evt.data.tokens} tk
                            </span>
                          )}
                          {isVip && (
                            <span className="text-[9px] bg-amber-400 text-slate-950 px-1 rounded font-black">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {evt.data.message || (isTip ? 'Tip direct' : 'Mesaj chat')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[10px] text-slate-500">
                      <div>{new Date(evt.timestamp).toLocaleTimeString()}</div>
                      <span className="text-emerald-400 text-[9px]">● SAVED IN SQLITE</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Payload & SQLite Inspector (Right 5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-full min-h-[440px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-bold text-slate-200 uppercase">Detalii Payload & Tranzacție SQL</span>
            </div>
            {selectedEvent && (
              <span className="text-[10px] font-mono text-slate-400">ID: {selectedEvent.id?.slice(0, 10)}...</span>
            )}
          </div>

          {selectedEvent ? (
            <div className="mt-3 space-y-3 flex-1 flex flex-col text-xs">
              {/* HTTP Request Headers */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  HTTP Request Headers
                </span>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <div><span className="text-slate-500">POST</span> /v1/bot/event</div>
                  <div><span className="text-slate-500">Authorization:</span> Bearer glw_sec_89dfa47b19283f</div>
                  <div><span className="text-slate-500">Content-Type:</span> application/json</div>
                </div>
              </div>

              {/* JSON Payload */}
              <div className="flex-1 flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  JSON Body Primit
                </span>
                <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-pink-300/90 overflow-auto max-h-[160px]">
                  <pre className="whitespace-pre">
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Simulated SQLite Query executed */}
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5" />
                  Interogare SQLite Executată
                </span>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-300 leading-relaxed overflow-x-auto">
                  {selectedEvent.type === 'tip' ? (
                    <div>
                      INSERT INTO bot_events (event_type, model_username, sender_username, amount_tokens, is_vip)
                      VALUES ('{selectedEvent.type}', '{selectedEvent.model}', '{selectedEvent.data.tipper}', {selectedEvent.data.tokens}, {selectedEvent.data.isVip ? 1 : 0});
                      <br/>
                      <span className="text-slate-500">-- Upsert în tipper_stats: total_tokens = total_tokens + {selectedEvent.data.tokens}</span>
                    </div>
                  ) : (
                    <div>
                      INSERT INTO bot_events (event_type, model_username, sender_username, message)
                      VALUES ('{selectedEvent.type}', '{selectedEvent.model}', '{selectedEvent.data.sender}', '{selectedEvent.data.message}');
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-6">
              <Eye className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
              <span>Selectează un eveniment din lista din stânga pentru a-i inspecta corpul JSON și interogarea SQL asociată.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
