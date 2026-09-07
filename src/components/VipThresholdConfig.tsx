import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Crown, 
  Sparkles, 
  Sliders, 
  MessageSquare, 
  Send, 
  Check, 
  Copy, 
  Terminal, 
  Zap, 
  Volume2, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  Code,
  Smartphone,
  Save,
  RotateCcw
} from 'lucide-react';

interface VipThresholdConfigProps {
  onSaveConfig?: (config: any) => void;
}

export const VipThresholdConfig: React.FC<VipThresholdConfigProps> = ({ onSaveConfig }) => {
  // Threshold settings state
  const [vipThreshold, setVipThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('glowbot_vip_threshold');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [pushThreshold, setPushThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('glowbot_push_threshold');
    return saved ? parseInt(saved, 10) : 50;
  });

  const [minThankTokens, setMinThankTokens] = useState<number>(() => {
    const saved = localStorage.getItem('glowbot_min_thank_tokens');
    return saved ? parseInt(saved, 10) : 10;
  });

  const [delaySeconds, setDelaySeconds] = useState<number>(() => {
    const saved = localStorage.getItem('glowbot_thank_delay');
    return saved ? parseFloat(saved) : 1.5;
  });

  const [enablePush, setEnablePush] = useState<boolean>(() => {
    const saved = localStorage.getItem('glowbot_enable_push');
    return saved !== null ? saved === 'true' : true;
  });

  const [pushChannel, setPushChannel] = useState<'telegram' | 'discord' | 'custom_webhook'>('telegram');
  const [webhookUrl, setWebhookUrl] = useState<string>('https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>');

  // Template settings
  const [vipThankTemplate, setVipThankTemplate] = useState<string>(() => {
    const saved = localStorage.getItem('glowbot_vip_thank_template');
    return saved || '👑 Wow, {user}! Mulțumesc infinit pentru cele {tokens} token-uri fabuloase! Ești acum VIP în camera mea! ✨❤️';
  });

  const [standardThankTemplate, setStandardThankTemplate] = useState<string>(() => {
    const saved = localStorage.getItem('glowbot_std_thank_template');
    return saved || 'Mulțumesc mult, {user}, pentru cele {tokens} token-uri! 🥰';
  });

  const [pushAlertTemplate, setPushAlertTemplate] = useState<string>(
    '🚨 ALERTĂ TIP MARE ({tokens} tk / ${usd}): {user} a donat în camera @{model}! Notă: "{message}"'
  );

  // Simulation test state
  const [testUser, setTestUser] = useState('Marco_VIP');
  const [testTokens, setTestTokens] = useState(150);
  const [testMessage, setTestMessage] = useState('Superb show ca întotdeauna! 🌟');
  const [simulatedAlert, setSimulatedAlert] = useState<{
    show: boolean;
    isVip: boolean;
    isPushTriggered: boolean;
    chatOutput: string;
    pushOutput: string;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Save to localStorage
  const handleSave = () => {
    localStorage.setItem('glowbot_vip_threshold', vipThreshold.toString());
    localStorage.setItem('glowbot_push_threshold', pushThreshold.toString());
    localStorage.setItem('glowbot_min_thank_tokens', minThankTokens.toString());
    localStorage.setItem('glowbot_thank_delay', delaySeconds.toString());
    localStorage.setItem('glowbot_enable_push', enablePush.toString());
    localStorage.setItem('glowbot_vip_thank_template', vipThankTemplate);
    localStorage.setItem('glowbot_std_thank_template', standardThankTemplate);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);

    if (onSaveConfig) {
      onSaveConfig({
        vipThreshold,
        pushThreshold,
        minThankTokens,
        delaySeconds,
        enablePush,
        vipThankTemplate,
        standardThankTemplate,
        webhookUrl
      });
    }
  };

  const handleResetDefaults = () => {
    setVipThreshold(100);
    setPushThreshold(50);
    setMinThankTokens(10);
    setDelaySeconds(1.5);
    setEnablePush(true);
    setVipThankTemplate('👑 Wow, {user}! Mulțumesc infinit pentru cele {tokens} token-uri fabuloase! Ești acum VIP în camera mea! ✨❤️');
    setStandardThankTemplate('Mulțumesc mult, {user}, pentru cele {tokens} token-uri! 🥰');
  };

  // Helper to insert placeholders into active textarea
  const handleInsertTag = (tag: string, target: 'vip' | 'standard' | 'push') => {
    if (target === 'vip') {
      setVipThankTemplate(prev => prev + ' ' + tag);
    } else if (target === 'standard') {
      setStandardThankTemplate(prev => prev + ' ' + tag);
    } else {
      setPushAlertTemplate(prev => prev + ' ' + tag);
    }
  };

  // Simulate evaluation
  const handleSimulate = () => {
    const isVip = testTokens >= vipThreshold;
    const isPushTriggered = enablePush && testTokens >= pushThreshold;
    const usdVal = (testTokens * 0.05).toFixed(2);

    let chatOutput = '';
    if (testTokens >= minThankTokens) {
      const template = isVip ? vipThankTemplate : standardThankTemplate;
      chatOutput = template
        .replace(/{user}/gi, testUser)
        .replace(/{tokens}/gi, testTokens.toString())
        .replace(/{usd}/gi, usdVal)
        .replace(/{model}/gi, 'alexa_star');
    } else {
      chatOutput = '(Sub pragul minim de mulțumire - Niciun mesaj trimis în chat)';
    }

    const pushOutput = pushAlertTemplate
      .replace(/{user}/gi, testUser)
      .replace(/{tokens}/gi, testTokens.toString())
      .replace(/{usd}/gi, usdVal)
      .replace(/{model}/gi, 'alexa_star')
      .replace(/{message}/gi, testMessage);

    setSimulatedAlert({
      show: true,
      isVip,
      isPushTriggered,
      chatOutput,
      pushOutput
    });
  };

  // Generated Express / SQLite snippet for this threshold configuration
  const generatedBackendSnippet = `// === MODUL CONFIGURABIL: PRAGURI NOTIFICĂRI & VIP MULȚUMIRE AUTOMATĂ ===
// Adăugat în server.js (Node.js Express + better-sqlite3)

const CONFIG = {
  VIP_TOKEN_THRESHOLD: ${vipThreshold},       // Prag VIP: peste ${vipThreshold} token-uri
  PUSH_TOKEN_THRESHOLD: ${pushThreshold},      // Prag Notificare Push: peste ${pushThreshold} token-uri
  MIN_THANK_TOKENS: ${minThankTokens},         // Prag minim mulțumire în chat
  ENABLE_PUSH_NOTIFICATIONS: ${enablePush},
  PUSH_WEBHOOK_URL: '${webhookUrl}',
  VIP_THANK_TEMPLATE: ${JSON.stringify(vipThankTemplate)},
  STD_THANK_TEMPLATE: ${JSON.stringify(standardThankTemplate)}
};

// 1. Funcție Expediere Notificare Push (Telegram / Discord / FCM)
async function sendPushNotification(tipEvent) {
  if (!CONFIG.ENABLE_PUSH_NOTIFICATIONS) return;
  if (tipEvent.tokens < CONFIG.PUSH_TOKEN_THRESHOLD) return;

  const usd = (tipEvent.tokens * 0.05).toFixed(2);
  const text = \`🚨 [GLOWBOT PUSH] Tip mare de la \${tipEvent.tipper}: \${tipEvent.tokens} tk ($\${usd})! "\${tipEvent.message || ''}"\`;

  try {
    // Exemplu apel Telegram Bot API sau Discord Webhook
    await fetch(CONFIG.PUSH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text, // Telegram format
        content: text // Discord format
      })
    });
    console.log(\`[Push Sent] Notificare trimisă cu succes pentru \${tipEvent.tipper} (\${tipEvent.tokens} tk)\`);
  } catch (err) {
    console.error('[Push Error] Nu s-a putut trimite notificarea push:', err.message);
  }
}

// 2. Evaluare în Handler-ul POST /v1/bot/event
app.post('/v1/bot/event', authenticateBotToken, async (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'tip') {
    const tokens = parseInt(data.tokens, 10) || 0;
    const isVip = tokens >= CONFIG.VIP_TOKEN_THRESHOLD;

    // Trigger Push Notification dacă depășește pragul configurat
    if (tokens >= CONFIG.PUSH_TOKEN_THRESHOLD) {
      sendPushNotification(data);
    }

    // Generează mulțumirea automată dacă este peste pragul minim
    let autoThankMessage = null;
    if (tokens >= CONFIG.MIN_THANK_TOKENS) {
      const template = isVip ? CONFIG.VIP_THANK_TEMPLATE : CONFIG.STD_THANK_TEMPLATE;
      autoThankMessage = template
        .replace(/{user}/g, data.tipper)
        .replace(/{tokens}/g, tokens.toString());
    }

    // Salvare în SQLite cu flag-urile aferente
    insertEventStmt.run({
      event_type: 'tip',
      model_username: req.botModel.model_username,
      sender_username: data.tipper,
      amount_tokens: tokens,
      message: data.message,
      is_vip: isVip ? 1 : 0,
      raw_payload: JSON.stringify(req.body)
    });

    return res.json({ 
      success: true, 
      is_vip: isVip, 
      push_notified: tokens >= CONFIG.PUSH_TOKEN_THRESHOLD,
      suggested_thank: autoThankMessage 
    });
  }
});`;

  return (
    <div id="vip-threshold-config-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-pink-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>Configurare Praguri &amp; Automatizări</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Praguri Notificări Push &amp; Mulțumire Automată VIP
          </h3>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl">
            Stabilește valorile de declanșare pentru alertele pe telefon/dispozitiv și personalizează mesajele automate expediate în chat către suporterii VIP.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="reset-thresholds-btn"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            title="Reinițializează la valorile implicite de fabrică"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            id="save-thresholds-btn"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md shadow-pink-600/20 transition-all cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Salvat cu Succes!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvează Setările</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns (Left: Numerical Threshold Sliders, Right: Push & Webhook Settings) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Column 1: Threshold Numeric Sliders */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Crown className="w-4 h-4" />
            <span>1. Praguri de Token-uri pentru VIP &amp; Chat</span>
          </div>

          {/* VIP Threshold Slider */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="vip-threshold-input" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Prag Recunoaștere VIP</span>
                <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 font-mono font-bold">
                  Statut Special
                </span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="vip-threshold-number"
                  type="number"
                  min="10"
                  max="5000"
                  step="10"
                  value={vipThreshold}
                  onChange={(e) => setVipThreshold(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-yellow-400 text-right focus:outline-none focus:border-pink-500"
                />
                <span className="text-xs text-slate-400 font-mono">tk</span>
              </div>
            </div>
            <input
              id="vip-threshold-slider"
              type="range"
              min="20"
              max="1000"
              step="10"
              value={vipThreshold}
              onChange={(e) => setVipThreshold(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>20 tk</span>
              <span>100 tk (Recomandat)</span>
              <span>250 tk</span>
              <span>500 tk</span>
              <span>1000 tk</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Utilizatorii care trimit dintr-o dată sau acumulează acest număr de token-uri vor fi marcați în SQLite cu <code className="text-yellow-300 font-mono">is_vip = 1</code> și vor primi mulțumirea specială VIP.
            </p>
          </div>

          {/* Push Notification Threshold Slider */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="push-threshold-input" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Prag Notificare Push (Mobil/Alertă)</span>
                <span className="text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20 font-mono font-bold">
                  High Priority
                </span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="push-threshold-number"
                  type="number"
                  min="5"
                  max="5000"
                  step="5"
                  value={pushThreshold}
                  onChange={(e) => setPushThreshold(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-pink-400 text-right focus:outline-none focus:border-pink-500"
                />
                <span className="text-xs text-slate-400 font-mono">tk</span>
              </div>
            </div>
            <input
              id="push-threshold-slider"
              type="range"
              min="10"
              max="500"
              step="5"
              value={pushThreshold}
              onChange={(e) => setPushThreshold(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>10 tk</span>
              <span>50 tk (Recomandat)</span>
              <span>100 tk</span>
              <span>250 tk</span>
              <span>500 tk</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Declanșează un apel webhook / push notification instant când un spectator trimite cel puțin această sumă ({pushThreshold} tk &asymp; ${(pushThreshold * 0.05).toFixed(2)} USD).
            </p>
          </div>

          {/* Minimum Thank Tokens & Anti-spam Delay */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 space-y-1.5">
              <label htmlFor="min-thank-input" className="text-xs font-medium text-slate-300 block">
                Prag Minim Mulțumire
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="min-thank-input"
                  type="number"
                  min="1"
                  max="100"
                  value={minThankTokens}
                  onChange={(e) => setMinThankTokens(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200"
                />
                <span className="text-xs text-slate-400 font-mono">tk</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Evită spamul în chat la 1 token</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 space-y-1.5">
              <label htmlFor="delay-seconds-input" className="text-xs font-medium text-slate-300 block">
                Întârziere Expediere
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="delay-seconds-input"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200"
                />
                <span className="text-xs text-slate-400 font-mono">sec</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Aspect uman, nedetectabil ca bot</span>
            </div>
          </div>
        </div>

        {/* Column 2: Push Notifications Channel & Endpoint */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Bell className="w-4 h-4" />
              <span>2. Canal Notificări Push Instantanee</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-slate-300 font-medium">Activare Push:</span>
              <input
                id="enable-push-toggle"
                type="checkbox"
                checked={enablePush}
                onChange={(e) => setEnablePush(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-pink-600 focus:ring-0 cursor-pointer accent-pink-600"
              />
            </label>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Tip Serviciu Notificare Push
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'telegram', label: 'Telegram Bot', icon: <Smartphone className="w-3.5 h-3.5" /> },
                  { id: 'discord', label: 'Discord Webhook', icon: <ExternalLink className="w-3.5 h-3.5" /> },
                  { id: 'custom_webhook', label: 'Webhook HTTP', icon: <Terminal className="w-3.5 h-3.5" /> }
                ].map((item) => (
                  <button
                    key={item.id}
                    id={`push-channel-${item.id}`}
                    type="button"
                    onClick={() => {
                      setPushChannel(item.id as any);
                      if (item.id === 'telegram') {
                        setWebhookUrl('https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>');
                      } else if (item.id === 'discord') {
                        setWebhookUrl('https://discord.com/api/webhooks/<ID>/<TOKEN>');
                      } else {
                        setWebhookUrl('https://glowbby.online/v1/bot/push-alert');
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      pushChannel === item.id
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="webhook-url-input" className="text-xs font-medium text-slate-300 block mb-1">
                URL Endpoint Notificare ({pushChannel})
              </label>
              <input
                id="webhook-url-input"
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Trimis asincron la nivel de server fără a bloca conexiunea cu extensia.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Format Text Alertă Push</label>
                <div className="flex gap-1">
                  {['{user}', '{tokens}', '{usd}', '{message}'].map((placeholder) => (
                    <button
                      key={placeholder}
                      type="button"
                      onClick={() => handleInsertTag(placeholder, 'push')}
                      className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      title={`Inserează ${placeholder}`}
                    >
                      +{placeholder}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="push-alert-template-textarea"
                rows={2}
                value={pushAlertTemplate}
                onChange={(e) => setPushAlertTemplate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mesaje Automate de tip 'Mulțumire' pentru utilizatorii VIP */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" />
            <span>3. Mesaje Automate de Mulțumire (Chaturbate Room Chat)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Placeholder-uri dinamice: <code className="text-pink-300 font-mono">{'{user}'}</code>, <code className="text-pink-300 font-mono">{'{tokens}'}</code>, <code className="text-pink-300 font-mono">{'{usd}'}</code>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* VIP Template */}
          <div className="bg-slate-950/70 border border-yellow-500/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400">
                <Crown className="w-3.5 h-3.5" />
                <span>Mesaj Mulțumire VIP (pentru tips &ge; {vipThreshold} tk)</span>
              </div>
              <div className="flex gap-1">
                {['{user}', '{tokens}', '{usd}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertTag(tag, 'vip')}
                    className="text-[10px] font-mono bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="vip-thank-template-textarea"
              rows={3}
              value={vipThankTemplate}
              onChange={(e) => setVipThankTemplate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-yellow-100 font-sans leading-relaxed focus:outline-none focus:border-yellow-500"
            />
            <p className="text-[11px] text-slate-400">
              Expediat când un spectator atinge sau depășește pragul VIP de <strong>{vipThreshold} token-uri</strong>.
            </p>
          </div>

          {/* Standard Template */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                <span>Mesaj Mulțumire Standard ({minThankTokens} - {vipThreshold - 1} tk)</span>
              </div>
              <div className="flex gap-1">
                {['{user}', '{tokens}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertTag(tag, 'standard')}
                    className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="std-thank-template-textarea"
              rows={3}
              value={standardThankTemplate}
              onChange={(e) => setStandardThankTemplate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-pink-500"
            />
            <p className="text-[11px] text-slate-400">
              Expediat pentru donatorii obișnuiți cu cel puțin <strong>{minThankTokens} token-uri</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Simulation & Testing Sandbox */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Simulator Live Testare Praguri &amp; Notificări
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Testează cum reacționează logica la diferite sume de token-uri
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="test-user-input" className="text-[11px] text-slate-400 block mb-1">Nume Tipper Test</label>
            <input
              id="test-user-input"
              type="text"
              value={testUser}
              onChange={(e) => setTestUser(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label htmlFor="test-tokens-input" className="text-[11px] text-slate-400 block mb-1">Valoare Token-uri</label>
            <input
              id="test-tokens-input"
              type="number"
              value={testTokens}
              onChange={(e) => setTestTokens(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-amber-400 font-bold"
            />
          </div>
          <div>
            <label htmlFor="test-message-input" className="text-[11px] text-slate-400 block mb-1">Mesaj Tip (Opțional)</label>
            <input
              id="test-message-input"
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Presetări rapide:</span>
            <button
              onClick={() => { setTestTokens(25); setTestUser('Casual_Fan'); }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
            >
              25 tk (Standard)
            </button>
            <button
              onClick={() => { setTestTokens(75); setTestUser('Dan_London'); }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-pink-300 cursor-pointer"
            >
              75 tk (Push Alert)
            </button>
            <button
              onClick={() => { setTestTokens(250); setTestUser('Marco_VIP'); }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-yellow-300 cursor-pointer"
            >
              250 tk (VIP + Push)
            </button>
          </div>

          <button
            id="run-simulation-btn"
            onClick={handleSimulate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Simulează Tranzacție &amp; Evaluează Praguri</span>
          </button>
        </div>

        {/* Simulation Output Card */}
        {simulatedAlert && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase">Rezultate Evaluare Praguri:</span>
              {simulatedAlert.isVip ? (
                <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-400" /> STATUT VIP ATINS (&ge; {vipThreshold} tk)
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  TIP STANDARD (&lt; {vipThreshold} tk)
                </span>
              )}

              {simulatedAlert.isPushTriggered ? (
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <Bell className="w-3 h-3 text-emerald-400" /> NOTIFICARE PUSH EXPEDIATĂ (&ge; {pushThreshold} tk)
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-slate-850 px-2 py-0.5 rounded">
                  Push Inactiv (&lt; {pushThreshold} tk)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Chaturbate Room Output Preview */}
              <div className="bg-[#0e111a] p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                  <span>Mesaj Trimis în Chatul Camerei (după {delaySeconds}s)</span>
                </div>
                <div className="text-xs font-sans text-pink-300 bg-slate-900/90 p-2.5 rounded border border-pink-500/20 leading-relaxed">
                  <strong className="text-pink-400">@alexa_star:</strong> {simulatedAlert.chatOutput}
                </div>
              </div>

              {/* Push Notification Toast Preview */}
              <div className="bg-[#0e111a] p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Alertă Notificare Push pe Telefon / Webhook</span>
                </div>
                {simulatedAlert.isPushTriggered ? (
                  <div className="text-xs font-mono text-emerald-300 bg-emerald-950/30 p-2.5 rounded border border-emerald-500/30 leading-relaxed">
                    {simulatedAlert.pushOutput}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic p-2.5 bg-slate-900/50 rounded border border-slate-800">
                    Suma ({testTokens} tk) este sub pragul de alertă push configurat ({pushThreshold} tk). Nicio notificare nu a fost trimisă.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generated Code Snippet for server.js */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
            <Code className="w-4 h-4 text-pink-400" />
            <span>Cod Node.js Generat Dinamic cu Pragurile Tale</span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(generatedBackendSnippet);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copiat!' : 'Copiază Codul'}</span>
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-60 leading-relaxed bg-[#0a0c12]">
          <code>{generatedBackendSnippet}</code>
        </pre>
      </div>
    </div>
  );
};
