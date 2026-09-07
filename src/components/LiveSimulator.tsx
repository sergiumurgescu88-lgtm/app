import React, { useState, useEffect, useRef } from 'react';
import { BotEventPayload, ExtensionSettings } from '../types/extension';
import { 
  Play, 
  RotateCcw, 
  Send, 
  Coins, 
  Crown, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface ChatItem {
  id: string;
  type: 'tip' | 'chat' | 'system' | 'bot';
  sender: string;
  text: string;
  tokens?: number;
  isVip?: boolean;
  userLevel?: string;
  timestamp: string;
}

interface LiveSimulatorProps {
  onEventCaptured: (event: BotEventPayload) => void;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({ onEventCaptured }) => {
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: 'm1',
      type: 'system',
      sender: 'System',
      text: 'Transmisia a început. Camera: alexa_star (Public Show)',
      timestamp: '14:20:01'
    },
    {
      id: 'm2',
      type: 'chat',
      sender: 'mark_viewer',
      text: 'Hey beautiful! Looking amazing today 😊',
      userLevel: 'regular',
      timestamp: '14:20:15'
    },
    {
      id: 'm3',
      type: 'tip',
      sender: 'VIP_Marco',
      text: 'tipped 25 tokens -- Keep dancing!',
      tokens: 25,
      isVip: false,
      timestamp: '14:20:45'
    }
  ]);

  const [chatInput, setChatInput] = useState('');
  const [sessionTokens, setSessionTokens] = useState(25);
  const [sessionTipsCount, setSessionTipsCount] = useState(1);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [botToken, setBotToken] = useState('glw_sec_89dfa47b19283f');
  const [modelName, setModelName] = useState('alexa_star');

  // Extension Settings in Simulator
  const [settings, setSettings] = useState<ExtensionSettings>({
    botToken: 'glw_sec_89dfa47b19283f',
    backendUrl: 'https://glowbby.online/v1/bot/event',
    modelUsername: 'alexa_star',
    enableTipTracking: true,
    enableVipDetection: true,
    vipThreshold: 100,
    enableAutoThank: true,
    autoThankTemplate: 'Mulțumesc mult, {user}, pentru cele {tokens} token-uri! ❤️',
    autoThankMinTokens: 10,
    enableAutoWelcome: true,
    autoWelcomeVipOnly: false,
    autoWelcomeTemplate: 'Bine ai venit în cameră, @{user}! ✨',
    enableOnScreenHud: true,
    enableSubjectRotator: true,
    subjectIntervalMinutes: 15,
    subjectTemplates: ['🔥 Goal: 500 tk for Spanking Show', '⚡ Tip 100 tk for VIP Snapchat']
  });

  // Simulated Background Queue
  const [queue, setQueue] = useState<BotEventPayload[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hudToast, setHudToast] = useState<{ title: string; subtitle: string } | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulated queue flush
  useEffect(() => {
    if (!isServerOnline || queue.length === 0 || isSyncing) return;

    const timer = setTimeout(() => {
      setIsSyncing(true);
      setTimeout(() => {
        // Send batch
        const sentBatch = [...queue];
        sentBatch.forEach(evt => onEventCaptured(evt));
        setQueue([]);
        setIsSyncing(false);
      }, 700);
    }, 1200);

    return () => clearTimeout(timer);
  }, [queue, isServerOnline, isSyncing, onEventCaptured]);

  const dispatchCapturedEvent = (event: BotEventPayload) => {
    if (isServerOnline) {
      onEventCaptured(event);
    } else {
      // Offline: push to background retry queue
      setQueue(prev => [...prev, event]);
    }
  };

  const triggerTip = (sender: string, tokens: number, note?: string) => {
    const isVip = tokens >= settings.vipThreshold;
    const time = new Date().toLocaleTimeString();

    const tipMessage: ChatItem = {
      id: 'tip_' + Date.now(),
      type: 'tip',
      sender,
      text: `tipped ${tokens} tokens${note ? ` -- ${note}` : ''}`,
      tokens,
      isVip,
      timestamp: time
    };

    setMessages(prev => [...prev, tipMessage]);
    setSessionTokens(prev => prev + tokens);
    setSessionTipsCount(prev => prev + 1);

    // Show on-screen toast
    setHudToast({
      title: `💰 ${sender} + ${tokens} tk`,
      subtitle: isVip ? '🌟 VIP SUPPORTER DETECTAT!' : 'Tip înregistrat'
    });
    setTimeout(() => setHudToast(null), 3500);

    // Dispatch to GlowBot Event Bridge
    const eventPayload: BotEventPayload = {
      id: 'evt_' + Date.now(),
      type: 'tip',
      model: modelName,
      timestamp: new Date().toISOString(),
      data: {
        tipper: sender,
        tokens,
        message: note || '',
        isVip
      }
    };
    dispatchCapturedEvent(eventPayload);

    // Auto-Thank reply
    if (settings.enableAutoThank && tokens >= settings.autoThankMinTokens) {
      setTimeout(() => {
        const replyText = settings.autoThankTemplate
          .replace(/{user}/gi, sender)
          .replace(/{tokens}/gi, tokens.toString());

        setMessages(prev => [
          ...prev,
          {
            id: 'bot_' + Date.now(),
            type: 'bot',
            sender: modelName + ' (GlowBot)',
            text: replyText,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }, 1000);
    }
  };

  const triggerChatMessage = (sender: string, text: string, userLevel: string = 'regular') => {
    const time = new Date().toLocaleTimeString();
    const isFirstTime = !messages.some(m => m.sender === sender && m.type === 'chat');

    const newChat: ChatItem = {
      id: 'chat_' + Date.now(),
      type: 'chat',
      sender,
      text,
      userLevel,
      timestamp: time
    };

    setMessages(prev => [...prev, newChat]);

    // Dispatch to event bridge
    const eventPayload: BotEventPayload = {
      id: 'evt_' + Date.now(),
      type: 'chat_message',
      model: modelName,
      timestamp: new Date().toISOString(),
      data: {
        sender,
        message: text,
        userLevel: userLevel as any
      }
    };
    dispatchCapturedEvent(eventPayload);

    // Auto-Welcome logic if viewer is new to session
    if (settings.enableAutoWelcome && isFirstTime) {
      setTimeout(() => {
        const welcomeText = settings.autoWelcomeTemplate.replace(/{user}/gi, sender);
        setMessages(prev => [
          ...prev,
          {
            id: 'bot_wel_' + Date.now(),
            type: 'bot',
            sender: modelName + ' (GlowBot)',
            text: welcomeText,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }, 1200);
    }
  };

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    triggerChatMessage('Viewer_' + Math.floor(Math.random() * 899 + 100), chatInput.trim());
    setChatInput('');
  };

  return (
    <div id="live-simulator-container" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Chaturbate Room Simulation Panel (Left 7 cols) */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
        {/* Header replicating Chaturbate Room Top */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm">{modelName}</span>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 uppercase font-mono font-bold">LIVE</span>
                <span className="text-xs text-slate-400">1,420 Spectatori</span>
              </div>
              <div className="text-[11px] text-pink-400 font-medium">Goal: 500 tk for Spanking Show (245/500 tk)</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMessages([]);
                setSessionTokens(0);
                setSessionTipsCount(0);
              }}
              title="Resetează chatul"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Clear</span>
            </button>
          </div>
        </div>

        {/* Replicated Chat Container (#chat_text_list) */}
        <div className="relative flex-1 min-h-[360px] max-h-[420px] p-3 overflow-y-auto font-sans text-xs flex flex-col gap-2 bg-[#0d1017]" ref={chatScrollRef} id="chat_text_list">
          {messages.map((m) => {
            if (m.type === 'system') {
              return (
                <div key={m.id} className="py-1 px-2.5 rounded bg-slate-800/50 text-slate-400 text-[11px] border border-slate-800/80">
                  <span className="text-slate-500 mr-2">[{m.timestamp}]</span>
                  {m.text}
                </div>
              );
            }

            if (m.type === 'tip') {
              return (
                <div 
                  key={m.id} 
                  className={`py-2 px-3 rounded-lg flex items-start justify-between border transition-all ${
                    m.isVip 
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                      : 'bg-pink-500/10 border-pink-500/30 text-pink-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{m.isVip ? '👑' : '💰'}</span>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={m.isVip ? 'text-amber-400' : 'text-pink-300'}>{m.sender}</span>
                        <span className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                          +{m.tokens} tk
                        </span>
                        {m.isVip && (
                          <span className="text-[10px] bg-amber-400 text-slate-950 px-1 rounded font-extrabold uppercase">VIP</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{m.text}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{m.timestamp}</span>
                </div>
              );
            }

            if (m.type === 'bot') {
              return (
                <div key={m.id} className="py-1.5 px-3 rounded bg-pink-950/40 border border-pink-500/30 text-pink-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <div>
                      <span className="font-bold text-pink-400 mr-1.5">{m.sender}:</span>
                      <span>{m.text}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-pink-400/60 font-mono">{m.timestamp}</span>
                </div>
              );
            }

            return (
              <div key={m.id} className="py-1 px-2 rounded hover:bg-slate-800/40 flex items-start justify-between group">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${
                    m.userLevel === 'mod' ? 'text-emerald-400' :
                    m.userLevel === 'fanclub' ? 'text-purple-400' : 'text-blue-400'
                  }`}>
                    {m.sender}:
                  </span>
                  <span className="text-slate-200">{m.text}</span>
                </div>
                <span className="text-[10px] text-slate-600 font-mono">{m.timestamp}</span>
              </div>
            );
          })}

          {/* Floating HUD Widget Simulation */}
          {settings.enableOnScreenHud && (
            <div 
              id="sim-hud" 
              className="absolute bottom-3 right-3 bg-slate-950/90 border border-pink-500/50 backdrop-blur-md rounded-xl p-2.5 px-3.5 text-[11px] shadow-2xl flex items-center gap-3 text-white pointer-events-none select-none z-10"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-extrabold text-pink-500 tracking-wider">GLOWBOT</span>
              </div>
              <div className="w-[1px] h-3 bg-slate-700"></div>
              <div className="flex items-center gap-2">
                <span>💰 <strong className="text-amber-400">{sessionTokens}</strong> tk</span>
                <span>⚡ <strong className="text-slate-300">{sessionTipsCount}</strong> tips</span>
              </div>
            </div>
          )}

          {/* Floating Toast Notification Simulation */}
          {hudToast && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-950 to-pink-950 border border-pink-500 rounded-lg p-2.5 px-4 text-white shadow-2xl z-20 animate-bounce">
              <div className="font-bold text-amber-300 text-xs">{hudToast.title}</div>
              <div className="text-[10px] text-pink-200">{hudToast.subtitle}</div>
            </div>
          )}
        </div>

        {/* Chat input box */}
        <form onSubmit={handleManualSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input
            id="sim-chat-input"
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Scrie un mesaj de test în camera Chaturbate..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-sans"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Trimite</span>
          </button>
        </form>
      </div>

      {/* Control Actions & Simulation Triggers (Right 5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Quick Event Simulation Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Simulează Evenimente Chaturbate
            </span>
            <span className="text-[10px] text-slate-500 font-mono">MutationObserver Test</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-sim-tip-25"
              onClick={() => triggerTip('viewer_dan', 25, 'You look fantastic!')}
              className="p-2.5 rounded-lg bg-pink-950/40 hover:bg-pink-900/50 border border-pink-500/30 text-pink-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Coins className="w-4 h-4 text-pink-400" />
              <span>Tip 25 Token-uri</span>
            </button>

            <button
              id="btn-sim-tip-50"
              onClick={() => triggerTip('robert_99', 50, 'Dance for me ❤️')}
              className="p-2.5 rounded-lg bg-pink-950/40 hover:bg-pink-900/50 border border-pink-500/30 text-pink-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Coins className="w-4 h-4 text-pink-400" />
              <span>Tip 50 Token-uri</span>
            </button>

            <button
              id="btn-sim-tip-100"
              onClick={() => triggerTip('WhaleLord', 100, 'VIP Goal Completed! 💥')}
              className="p-2.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Tip 100 tk (VIP)</span>
            </button>

            <button
              id="btn-sim-tip-500"
              onClick={() => triggerTip('KingStefan', 500, 'Take it all, goddess! 🔥')}
              className="p-2.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-400/60 text-amber-100 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>Tip 500 tk (MEGA)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              id="btn-sim-chat"
              onClick={() => triggerChatMessage('alex_fan', 'What is your next goal? 😍', 'purple')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Chat User cu Tokeni</span>
            </button>

            <button
              id="btn-sim-join"
              onClick={() => triggerChatMessage('new_supporter', 'Hello room!', 'regular')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Vizitator Nou (Welcome)</span>
            </button>
          </div>
        </div>

        {/* Network & Retry Simulator */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Stare Rețea & Coadă Retry
            </span>
            <button
              onClick={() => setIsServerOnline(!isServerOnline)}
              className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                isServerOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
              }`}
            >
              {isServerOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>Server Online (200 OK)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span>Server Picat (Simulare Offline)</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Coada Offline (chrome.storage.local):</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                queue.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {queue.length} evenimente reținute
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Mecanism Trimitere:</span>
              <span className="font-mono text-slate-300">
                {isSyncing ? 'Sincronizare Batch...' : isServerOnline ? 'Transmitere Imediată' : 'Exponential Backoff Activ'}
              </span>
            </div>

            {!isServerOnline && (
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200/90 text-[11px] leading-relaxed">
                💡 <strong>Demonstrație:</strong> Când backend-ul este oprit, evenimentele nu se pierd! 
                Ele sunt stocate în buffer-ul extensiei. Când serverul redevine online, Service Worker-ul le trimite automat în calupuri (batch) prin tranzacții SQLite.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
