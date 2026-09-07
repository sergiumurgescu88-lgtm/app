export const MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "GlowBot - Chaturbate Model Assistant",
  "version": "1.0.0",
  "description": "Extensie privată și securizată pentru tracking tip-uri în timp real, detectare VIP, auto-welcome și sincronizare backend pentru Chaturbate.",
  "permissions": [
    "storage",
    "notifications",
    "alarms"
  ],
  "host_permissions": [
    "*://*.chaturbate.com/*",
    "*://chaturbate.com/*",
    "https://glowbby.online/*",
    "http://localhost:*/*",
    "http://127.0.0.1:*/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.chaturbate.com/*",
        "*://chaturbate.com/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "GlowBot Control Panel",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`;

export const BACKGROUND_JS = `/**
 * GlowBot - Background Service Worker (Manifest V3)
 * Gestionează:
 * - Recepționarea evenimentelor din content.js
 * - Coada persistentă în chrome.storage.local (pentru scenarii offline/erori server)
 * - Sistem de Retry cu Exponential Backoff + Jitter
 * - Autentificare securizată cu Bearer Token către backend-ul personalizat Node.js
 */

const STORAGE_QUEUE_KEY = 'glowbot_event_queue';
const STORAGE_SETTINGS_KEY = 'glowbot_settings';
const MAX_QUEUE_SIZE = 500;
const INITIAL_BACKOFF_MS = 1500;
const MAX_BACKOFF_MS = 60000;
const MAX_RETRIES = 10;

let isSyncing = false;
let currentRetryCount = 0;
let syncTimeoutId = null;

/**
 * Inițializare Service Worker
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[GlowBot Service Worker] Instalat cu succes.');
  initializeStorage();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[GlowBot Service Worker] Pornit la deschiderea browserului.');
  scheduleSync(500);
});

/**
 * Inițializează setările implicite dacă nu există deja
 */
async function initializeStorage() {
  const data = await chrome.storage.local.get([STORAGE_SETTINGS_KEY, STORAGE_QUEUE_KEY]);
  if (!data[STORAGE_SETTINGS_KEY]) {
    await chrome.storage.local.set({
      [STORAGE_SETTINGS_KEY]: {
        botToken: '',
        backendUrl: 'https://glowbby.online/v1/bot/event',
        enableTipTracking: true,
        enableVipDetection: true,
        vipThreshold: 100,
        enableAutoThank: true,
        autoThankTemplate: 'Mulțumesc mult, {user}, pentru cele {tokens} token-uri! ❤️',
        autoThankMinTokens: 10,
        enableAutoWelcome: false,
        autoWelcomeTemplate: 'Bine ai venit, @{user}! ✨',
        enableOnScreenHud: true,
        enableDesktopNotifications: true,
        desktopMinTokens: 25,
        enableAutoGoalSubject: true,
        goalTokensThreshold: 500,
        goalReachedSubjectTemplate: '🎯 GOAL REACHED! Următorul goal: {nextGoal}tk | Mulțumiri tuturor!'
      }
    });
  }
  if (!data[STORAGE_QUEUE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_QUEUE_KEY]: [] });
  }
}

/**
 * Declanșează notificare desktop nativă în Chrome dacă pragul este depășit
 */
function showDesktopNotificationIfEligible(eventData, settings) {
  if (!chrome.notifications || !settings.enableDesktopNotifications) return;
  if (eventData.type !== 'tip' || !eventData.data) return;

  const tokens = parseInt(eventData.data.tokens, 10) || 0;
  const minThreshold = settings.desktopMinTokens || 25;
  if (tokens < minThreshold) return;

  const isVip = tokens >= (settings.vipThreshold || 100);
  const usd = (tokens * 0.05).toFixed(2);
  const notifId = 'glowbot_notif_' + Date.now();

  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: isVip 
      ? ('👑 VIP MEGA TIP: ' + eventData.data.tipper + ' (' + tokens + ' tk / $' + usd + ')!') 
      : ('🪙 Tip Nou: ' + eventData.data.tipper + ' (' + tokens + ' tk / $' + usd + ')'),
    message: eventData.data.message 
      ? ('Mesaj: "' + eventData.data.message + '"') 
      : ('Donație nouă de ' + tokens + ' tokens primită în camera Chaturbate!'),
    priority: isVip ? 2 : 1,
    requireInteraction: isVip
  });
}

/**
 * Listener pentru mesaje interne de la content.js și popup.js
 * Include verificare strictă de securitate Manifest V3 (Cross-extension security guard)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Securitate MV3: Blochează orice apel din afara propriei extensii
  if (sender.id !== chrome.runtime.id) {
    console.warn('[GlowBot Security] Mesaj extern neautorizat respins de la sender:', sender.id);
    return false;
  }

  const { type, payload } = message || {};

  switch (type) {
    case 'EVENT_CAPTURED':
      handleCapturedEvent(payload)
        .then(() => sendResponse({ status: 'queued' }))
        .catch(err => sendResponse({ status: 'error', error: err.message }));
      return true; // async response

    case 'GET_QUEUE_STATUS':
      getQueueStatus().then(status => sendResponse(status));
      return true;

    case 'TRIGGER_SYNC_NOW':
      processQueue(true).then(res => sendResponse(res));
      return true;

    case 'CLEAR_QUEUE':
      clearQueue().then(() => sendResponse({ success: true }));
      return true;

    case 'TEST_BACKEND_CONNECTION':
      testConnection(payload).then(res => sendResponse(res));
      return true;

    default:
      sendResponse({ status: 'unknown_type' });
      return false;
  }
});

// Listener pentru Chrome Alarms (trezește Service Worker-ul din idle pentru sincronizare fiabilă)
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'glowbot_sync_alarm') {
      console.log('[GlowBot Service Worker] Trezit de Alarm pentru procesarea cozii.');
      processQueue();
    }
  });
}

/**
 * Salvează un eveniment nou în coada persistentă și pornește procesarea
 */
async function handleCapturedEvent(eventData) {
  if (!eventData || typeof eventData !== 'object') return;

  const store = await chrome.storage.local.get([STORAGE_QUEUE_KEY, STORAGE_SETTINGS_KEY]);
  const queue = store[STORAGE_QUEUE_KEY] || [];
  const settings = store[STORAGE_SETTINGS_KEY] || {};

  if (!settings.botToken) {
    console.warn('[GlowBot] Eveniment ignorat: Bot Token nu este configurat.');
    return;
  }

  // Sanitizare ușoară a payload-ului pentru a preveni obiecte corupte în storage
  const sanitizedPayload = {
    type: String(eventData.type || 'unknown').slice(0, 50),
    model: String(eventData.model || 'unknown').slice(0, 50),
    timestamp: eventData.timestamp || new Date().toISOString(),
    data: eventData.data && typeof eventData.data === 'object' ? eventData.data : {}
  };

  const queueItem = {
    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    payload: sanitizedPayload,
    addedAt: Date.now(),
    attempts: 0
  };

  // Previne umplerea memoriei dacă serverul este oprit mult timp
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift(); // elimină cel mai vechi element
  }

  queue.push(queueItem);
  await chrome.storage.local.set({ [STORAGE_QUEUE_KEY]: queue });

  console.log(\`[GlowBot] Eveniment salvat în coadă (Total: \${queue.length}):\`, sanitizedPayload.type);

  // Declanșează notificare desktop nativă în Chrome dacă este tip și pragul este atins
  showDesktopNotificationIfEligible(sanitizedPayload, settings);

  // Declanșează sincronizarea
  scheduleSync(0);
}

/**
 * Programează sincronizarea cu backoff și suport MV3 Alarms pentru background persistence
 */
function scheduleSync(delayMs) {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
  }

  if (delayMs <= 2000) {
    syncTimeoutId = setTimeout(() => {
      processQueue();
    }, delayMs);
  } else if (chrome.alarms) {
    // În Manifest V3, setTimeout poate fi suspendat când Service Worker-ul devine inactiv.
    // Chrome Alarms garantează că worker-ul va fi trezit pentru a trimite datele.
    const delayInMinutes = Math.max(delayMs / 60000, 0.1);
    chrome.alarms.create('glowbot_sync_alarm', { delayInMinutes });
  } else {
    syncTimeoutId = setTimeout(() => {
      processQueue();
    }, delayMs);
  }
}

/**
 * Trimite evenimentele din coadă către backend folosind Exponential Backoff
 */
async function processQueue(forceNow = false) {
  if (isSyncing) return { status: 'already_syncing' };

  const store = await chrome.storage.local.get([STORAGE_QUEUE_KEY, STORAGE_SETTINGS_KEY]);
  const queue = store[STORAGE_QUEUE_KEY] || [];
  const settings = store[STORAGE_SETTINGS_KEY] || {};

  if (queue.length === 0) {
    currentRetryCount = 0;
    return { status: 'empty_queue' };
  }

  if (!settings.botToken || !settings.backendUrl) {
    console.warn('[GlowBot] Configurație incompletă (lipsește Token sau Backend URL).');
    return { status: 'missing_config' };
  }

  isSyncing = true;

  try {
    // Luăm un batch de până la 20 evenimente simultan pentru eficiență sporită
    const batch = queue.slice(0, 20);
    const batchPayloads = batch.map(item => item.payload);

    console.log(\`[GlowBot] Se trimit \${batch.length} evenimente către: \${settings.backendUrl}\`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(settings.backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${settings.botToken.trim()}\`
      },
      body: JSON.stringify({
        batch: batchPayloads,
        sentAt: new Date().toISOString()
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok) {
      // Succes: eliminăm din coadă evenimentele trimise cu succes
      const sentIds = new Set(batch.map(item => item.id));
      const remainingQueue = queue.filter(item => !sentIds.has(item.id));

      await chrome.storage.local.set({
        [STORAGE_QUEUE_KEY]: remainingQueue,
        glowbot_last_sync: Date.now(),
        glowbot_last_error: null
      });

      currentRetryCount = 0;
      isSyncing = false;

      console.log(\`[GlowBot] Batch sincronizat cu succes. Rămase în coadă: \${remainingQueue.length}\`);

      // Dacă mai sunt evenimente în coadă, continuă imediat
      if (remainingQueue.length > 0) {
        scheduleSync(100);
      }
      return { status: 'success', remaining: remainingQueue.length };

    } else if (response.status === 401 || response.status === 403) {
      // Eroare de autentificare critică: nu insistăm inutil cu retry
      const errMsg = 'Bot Token invalid sau neautorizat (HTTP ' + response.status + ')';
      console.error('[GlowBot] ' + errMsg);
      await chrome.storage.local.set({ glowbot_last_error: errMsg });
      isSyncing = false;
      return { status: 'auth_error', message: errMsg };

    } else {
      throw new Error(\`Server returned status \${response.status}: \${response.statusText}\`);
    }

  } catch (error) {
    currentRetryCount++;
    const errMsg = error.name === 'AbortError' ? 'Timeout la conexiunea cu serverul' : error.message;

    // Calculează backoff exponențial: base * 2^retries + jitter (10-25%)
    const backoff = Math.min(
      MAX_BACKOFF_MS,
      INITIAL_BACKOFF_MS * Math.pow(2, currentRetryCount)
    );
    const jitter = Math.floor(Math.random() * (backoff * 0.2));
    const nextRetryDelay = backoff + jitter;

    console.warn(\`[GlowBot] Eroare sincronizare (\${errMsg}). Reîncercare #\${currentRetryCount} în \${Math.round(nextRetryDelay / 1000)}s\`);

    await chrome.storage.local.set({
      glowbot_last_error: \`Eroare (Încercare #\${currentRetryCount}): \${errMsg}\`
    });

    isSyncing = false;

    // Reprogramează retry dacă nu a fost cerut manual
    if (!forceNow) {
      scheduleSync(nextRetryDelay);
    }

    return { status: 'failed', retryIn: nextRetryDelay, error: errMsg };
  }
}

/**
 * Returnează statistici curente pentru Popup
 */
async function getQueueStatus() {
  const store = await chrome.storage.local.get([
    STORAGE_QUEUE_KEY,
    'glowbot_last_sync',
    'glowbot_last_error'
  ]);
  const queue = store[STORAGE_QUEUE_KEY] || [];
  return {
    queueLength: queue.length,
    isSyncing,
    retryCount: currentRetryCount,
    lastSync: store.glowbot_last_sync || null,
    lastError: store.glowbot_last_error || null
  };
}

/**
 * Golește manual coada de evenimente
 */
async function clearQueue() {
  await chrome.storage.local.set({
    [STORAGE_QUEUE_KEY]: [],
    glowbot_last_error: null
  });
  currentRetryCount = 0;
  console.log('[GlowBot] Coada a fost golită manual.');
}

/**
 * Testează conexiunea către server cu un eveniment de tip ping
 */
async function testConnection(customConfig) {
  try {
    const store = await chrome.storage.local.get(STORAGE_SETTINGS_KEY);
    const settings = store[STORAGE_SETTINGS_KEY] || {};
    const token = customConfig?.botToken || settings.botToken;
    const url = customConfig?.backendUrl || settings.backendUrl;

    if (!token || !url) {
      return { success: false, message: 'Lipsește Bot Token sau URL-ul backend-ului.' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token.trim()}\`
      },
      body: JSON.stringify({
        type: 'ping',
        model: 'connection_test',
        timestamp: new Date().toISOString(),
        data: { test: true, client: 'GlowBot_v1' }
      })
    });

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      return { success: true, message: 'Conexiune reușită cu backend-ul!', data: json };
    } else {
      return {
        success: false,
        message: \`Eroare server (HTTP \${res.status}): \${res.statusText}\`
      };
    }
  } catch (err) {
    return { success: false, message: 'Eroare de rețea: ' + err.message };
  }
}
`;

export const CONTENT_JS = `/**
 * GlowBot - Content Script (DOM Observer & Automation)
 * Optimizat pentru robustețe maximă și securitate Manifest V3:
 * - Resource Guard: Rulează DOAR pe pagini de transmisiune broadcaster (/b/)
 * - DOM Resilience: Selectori multipli de fallback pentru containere și mesaje
 * - Memory Leak Prevention: Limitare strictă a set-ului de evenimente și deconectare observer la unload
 */

(() => {
  'use strict';

  // 1. RESOURCE GUARD: Rulează logica DOAR dacă URL-ul conține /b/ (cameră de broadcaster)
  const currentPath = window.location.pathname;
  if (!currentPath.includes('/b/')) {
    console.log('[GlowBot Resource Guard] Pagină non-broadcaster detectată (' + currentPath + '). Observatorul rămâne inactiv pentru conservarea memoriei RAM.');
    return;
  }

  // Referințe lifecycle pentru curățare și prevenire memory leaks
  let chatObserver = null;
  let statusIntervalId = null;
  let chatRetryTimeoutId = null;
  let observerRetryCount = 0;
  const MAX_OBSERVER_RETRIES = 20;

  // Selectori de fallback pentru containerul de chat (DOM Resilience)
  const CHAT_CONTAINER_SELECTORS = [
    '#chat_text_list',
    '.chat-list',
    "[data-testid='chat-container']",
    "[data-testid='chat-box']",
    '.text-list',
    '.chat-box',
    '#chat_room_text_list',
    'div[id*="chat_text"]',
    'div[class*="chat-list"]'
  ];

  // Stare internă pentru sesiune
  const state = {
    modelUsername: detectModelUsername(),
    isBroadcaster: checkIfBroadcaster(),
    settings: {
      enableTipTracking: true,
      enableVipDetection: true,
      vipThreshold: 100,
      enableAutoThank: true,
      autoThankTemplate: 'Mulțumesc mult, {user}, pentru cele {tokens} token-uri! ❤️',
      autoThankMinTokens: 10,
      enableAutoWelcome: false,
      autoWelcomeTemplate: 'Bine ai venit, @{user}! ✨',
      enableOnScreenHud: true,
      enableAutoGoalSubject: true,
      goalTokensThreshold: 500,
      goalReachedSubjectTemplate: '🎯 GOAL REACHED! Următorul goal: {nextGoal}tk | Mulțumiri tuturor!',
      enableSoundAlerts: true,
      soundAlertThreshold: 25,
      soundAlertAudioUrl: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      soundAlertVolume: 0.8,
      enableVipCustomSound: true,
      vipSoundAlertAudioUrl: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
    },
    sessionTokens: 0,
    sessionTipsCount: 0,
    goalAlreadyTriggered: false,
    welcomedUsers: new Set(),
    processedEventIds: new Set()
  };

  console.log('[GlowBot Content Script] Broadcaster Room detectată (/b/). Inițializare pentru:', state.modelUsername);

  // Încarcă setările din storage
  chrome.storage.local.get('glowbot_settings', (res) => {
    if (res && res.glowbot_settings) {
      state.settings = { ...state.settings, ...res.glowbot_settings };
    }
    init();
  });

  // Reacționează la modificările setărilor făcute din Popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.glowbot_settings) {
      state.settings = { ...state.settings, ...changes.glowbot_settings.newValue };
      updateHud();
    }
  });

  // 2. MEMORY LEAK PREVENTION: Deconectare observere și curățare completă la reîncărcare / părăsire pagină
  function cleanup() {
    if (chatObserver) {
      chatObserver.disconnect();
      chatObserver = null;
    }
    if (chatRetryTimeoutId) {
      clearTimeout(chatRetryTimeoutId);
      chatRetryTimeoutId = null;
    }
    if (statusIntervalId) {
      clearInterval(statusIntervalId);
      statusIntervalId = null;
    }
    if (hudEl) {
      hudEl.remove();
      hudEl = null;
    }
    state.processedEventIds.clear();
    state.welcomedUsers.clear();
    console.log('[GlowBot Memory Guard] Observere deconectate și resurse curățate.');
  }

  window.addEventListener('beforeunload', cleanup, { capture: true });
  window.addEventListener('pagehide', cleanup, { capture: true });

  /**
   * Punct de pornire
   */
  function init() {
    startChatObserver();
    startStatusObserver();
    if (state.settings.enableOnScreenHud) {
      createOnScreenHud();
    }
  }

  /**
   * Extrage username-ul modelului din URL (/b/modelname/)
   */
  function detectModelUsername() {
    const path = window.location.pathname;
    const match = path.match(/^\\/b\\/([a-zA-Z0-9_\\-]+)/i) || path.match(/^\\/([a-zA-Z0-9_\\-]+)/i);
    return match ? match[1].toLowerCase() : 'broadcaster';
  }

  /**
   * Verifică dacă utilizatorul curent este cel care transmite (Broadcaster)
   */
  function checkIfBroadcaster() {
    return !!(
      window.location.pathname.includes('/b/') ||
      document.querySelector('#control_panel') ||
      document.querySelector('.broadcaster-tools') ||
      document.querySelector('[data-broadcaster-controls]')
    );
  }

  /**
   * Găsește primul container valid de chat folosind selectorii de fallback
   */
  function findChatContainer() {
    for (const selector of CHAT_CONTAINER_SELECTORS) {
      try {
        const el = document.querySelector(selector);
        if (el) return { element: el, selector };
      } catch (err) {
        // ignora selector invalid
      }
    }
    return null;
  }

  /**
   * 3. DOM RESILIENCE: Observer pentru mesaje și tip-uri în chat cu fallback multiplu
   */
  function startChatObserver() {
    const found = findChatContainer();

    if (!found) {
      observerRetryCount++;
      if (observerRetryCount <= MAX_OBSERVER_RETRIES) {
        chatRetryTimeoutId = setTimeout(startChatObserver, 1200);
      } else {
        console.warn('[GlowBot DOM Resilience] Containerul de chat nu a fost găsit după ' + MAX_OBSERVER_RETRIES + ' încercări. Se așteaptă modificări DOM.');
      }
      return;
    }

    const chatContainer = found.element;
    console.log('[GlowBot] S-a atașat MutationObserver pe containerul de chat prin:', found.selector);

    if (chatObserver) {
      chatObserver.disconnect();
    }

    chatObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            handleChatMessageNode(node);
          }
        }
      }
    });

    chatObserver.observe(chatContainer, {
      childList: true,
      subtree: false // optimizat pentru performanță minimă pe CPU
    });
  }

  /**
   * Parsează un nod nou apărut în chat
   */
  function handleChatMessageNode(node) {
    const rawText = node.textContent || '';
    if (!rawText.trim()) return;

    // Previne procesarea dublă folosind semnătură de nod
    const nodeSignature = rawText.slice(0, 100);
    if (state.processedEventIds.has(nodeSignature)) return;
    state.processedEventIds.add(nodeSignature);

    // 4. MEMORY LEAK PREVENTION: Limitare strictă conform cerinței (dacă size > 1000 se curăță)
    if (state.processedEventIds.size > 1000) {
      state.processedEventIds.clear();
    }

    // 1. Verifică dacă este un eveniment de TIP
    const tipData = parseTipNotice(node, rawText);
    if (tipData) {
      handleTipDetected(tipData, node);
      return;
    }

    // 2. Mesaj normal de chat
    const chatData = parseRegularChatMessage(node, rawText);
    if (chatData) {
      handleChatMessage(chatData);
    }
  }

  /**
   * Detectează și extrage detaliile unui tip prin regex și fallback de clase
   */
  function parseTipNotice(node, text) {
    const isTipClass = 
      node.classList.contains('tip_notice') ||
      node.classList.contains('system_notice') ||
      node.classList.contains('tip-notice') ||
      node.getAttribute('data-type') === 'tip' ||
      node.getAttribute('data-notice') === 'tip';

    // Regex robust pentru tip-uri Chaturbate
    const tipRegex = /([a-zA-Z0-9_\-]+)\\s+tipped\\s+(\\d+)\\s+tokens?(?:\\s*[-:]\\s*(.*))?/i;
    const match = text.match(tipRegex);

    if (match || isTipClass) {
      let tipper = match ? match[1] : '';
      let tokens = match ? parseInt(match[2], 10) : 0;
      let note = match && match[3] ? match[3].trim() : '';

      // Fallback selectori pentru utilizator dacă regex-ul nu a extras
      if (!tipper) {
        const userEl = node.querySelector('.username, [data-username], a.user, span.user, a[href*="/"]');
        if (userEl) tipper = userEl.textContent.trim();
      }
      if (!tokens) {
        const tokenMatch = text.match(/(\\d+)\\s+tokens?/i);
        if (tokenMatch) tokens = parseInt(tokenMatch[1], 10);
      }

      if (tokens > 0) {
        return {
          tipper: tipper || 'Anonymous',
          tokens,
          note,
          rawText: text
        };
      }
    }

    return null;
  }

  /**
   * Gestionează apariția unui tip valid
   */
  function handleTipDetected(tip, tipNode) {
    const isVip = tip.tokens >= state.settings.vipThreshold;

    state.sessionTokens += tip.tokens;
    state.sessionTipsCount += 1;

    console.log(\`[GlowBot 💰 TIP DETECTAT] \${tip.tipper} a trimis \${tip.tokens} token-uri! VIP: \${isVip}\`);

    // VIP CHAT HIGHLIGHT: Evidențiere dinamică timp de 5 secunde în chatul broadcaster-ului
    if (isVip && tipNode && tipNode.style) {
      try {
        const originalTransition = tipNode.style.transition || '';
        const originalBorder = tipNode.style.border || '';
        const originalBackground = tipNode.style.background || '';
        const originalBoxShadow = tipNode.style.boxShadow || '';
        const originalBorderRadius = tipNode.style.borderRadius || '';

        tipNode.style.transition = 'all 0.35s ease';
        tipNode.style.border = '2px solid gold';
        tipNode.style.background = 'rgba(255, 215, 0, 0.12)';
        tipNode.style.boxShadow = '0 0 14px rgba(255, 215, 0, 0.45)';
        tipNode.style.borderRadius = '8px';

        setTimeout(() => {
          if (tipNode && tipNode.style) {
            tipNode.style.border = originalBorder;
            tipNode.style.background = originalBackground;
            tipNode.style.boxShadow = originalBoxShadow;
            tipNode.style.borderRadius = originalBorderRadius;
            tipNode.style.transition = originalTransition;
          }
        }, 5000);
      } catch (err) {
        console.warn('[GlowBot VIP Highlight Error]:', err);
      }
    }

    // AUTO-GOAL SUBJECT UPDATE: Verifică dacă s-a atins pragul configurat pentru goal
    const goalThreshold = state.settings.goalTokensThreshold || state.settings.vipThreshold || 500;
    if (state.settings.enableAutoGoalSubject && !state.goalAlreadyTriggered && state.sessionTokens >= goalThreshold) {
      state.goalAlreadyTriggered = true;
      triggerAutoGoalSubjectUpdate(goalThreshold);
    }

    // Actualizează HUD-ul local
    updateHud();

    // 1. Notificare pe ecran pentru model
    showToastNotification(
      \`💰 \${tip.tipper} + \${tip.tokens} tk\`,
      isVip ? '🌟 VIP SUPPORTER!' : 'Tip primit'
    );

    // 1.1. Alerte sonore locale în browser pentru tips & VIPs
    triggerSoundAlertForTip(tip.tokens, isVip);

    // 2. Trimite către Background Service Worker -> Node.js Backend
    sendToBackground({
      type: 'tip',
      model: state.modelUsername,
      timestamp: new Date().toISOString(),
      data: {
        tipper: tip.tipper,
        tokens: tip.tokens,
        message: tip.note,
        isVip
      }
    });

    // 3. Trimite mesaj automat de mulțumire în chat dacă e activat
    if (state.settings.enableAutoThank && tip.tokens >= state.settings.autoThankMinTokens) {
      const thankMsg = state.settings.autoThankTemplate
        .replace(/{user}/gi, tip.tipper)
        .replace(/{tokens}/gi, tip.tokens.toString());
      
      setTimeout(() => {
        sendChatMessageToRoom(thankMsg);
      }, 1200);
    }
  }

  /**
   * SOUND ALERTS: Redă sunete audio personalizate în contextul camerei live
   * Folosește API-ul nativ HTML5 Audio cu protecție împotriva erorilor și reglare volum
   */
  function triggerSoundAlertForTip(tokens, isVip) {
    if (!state.settings.enableSoundAlerts) return;

    const threshold = state.settings.soundAlertThreshold || 25;
    if (tokens < threshold) return;

    // Alege URL-ul corespunzător: VIP personalizat sau sunetul standard
    let audioUrl = state.settings.soundAlertAudioUrl || 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
    if (isVip && state.settings.enableVipCustomSound && state.settings.vipSoundAlertAudioUrl) {
      audioUrl = state.settings.vipSoundAlertAudioUrl;
    }

    if (!audioUrl) return;

    try {
      const audio = new Audio(audioUrl);
      const vol = typeof state.settings.soundAlertVolume === 'number' ? state.settings.soundAlertVolume : 0.8;
      audio.volume = Math.max(0, Math.min(1, vol));

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(\`[GlowBot Sound Alert 🔊] Sunet redat pentru tip de \${tokens} tk (\${isVip ? 'VIP' : 'Standard'}):\`, audioUrl);
        }).catch((err) => {
          console.warn('[GlowBot Sound Alert Warning] Redarea audio nu a putut fi pornită (autoplay policy / rețea):', err.message);
        });
      }
    } catch (err) {
      console.error('[GlowBot Sound Alert Error] Excepție la inițializarea Audio:', err);
    }
  }

  /**
   * AUTO-GOAL SUBJECT UPDATE
   * Găsește input-ul de room subject din DOM-ul Chaturbate, injectează noul text și simulează click pe salvare
   */
  function triggerAutoGoalSubjectUpdate(achievedGoal) {
    const nextGoal = achievedGoal * 2;
    const template = state.settings.goalReachedSubjectTemplate || '🎯 GOAL REACHED! Următorul goal: {nextGoal}tk';
    const newSubject = template
      .replace(/{goal}/gi, achievedGoal.toString())
      .replace(/{nextGoal}/gi, nextGoal.toString())
      .replace(/{tokens}/gi, state.sessionTokens.toString());

    console.log(\`[GlowBot 🎯 AUTO-GOAL] Goal atins (\${state.sessionTokens}/\${achievedGoal} tk)! Se actualizează subject-ul la: "\${newSubject}"\`);

    // Notificare vizuală pe ecran pentru model
    showToastNotification(
      '🎯 GOAL ATINS!',
      \`Subiectul se actualizează automat: \${newSubject.slice(0, 45)}...\`
    );

    updateRoomSubject(newSubject);
  }

  /**
   * Actualizează input-ul de subject al camerei și declanșează salvarea prin DOM
   */
  function updateRoomSubject(newSubject) {
    // Selectori de fallback pentru input/textarea de subject în broadcaster tools Chaturbate
    const subjectInputSelectors = [
      '#room_subject_input',
      '#id_subject',
      'input[name="subject"]',
      'textarea[name="subject"]',
      '#broadcaster_subject',
      '.room-subject-input',
      '[data-testid="room-subject-input"]'
    ];

    let subjectInput = null;
    for (const sel of subjectInputSelectors) {
      subjectInput = document.querySelector(sel);
      if (subjectInput) break;
    }

    // Dacă input-ul este ascuns în spatele unui buton de editare ("Edit Subject" / creion), simulează deschiderea lui
    if (!subjectInput) {
      const editBtn = document.querySelector('#edit_room_subject_button, .edit-subject-btn, [data-action="edit-subject"]');
      if (editBtn) {
        editBtn.click();
        setTimeout(() => updateRoomSubject(newSubject), 300);
        return;
      }
    }

    if (!subjectInput) {
      console.warn('[GlowBot Auto-Goal] Câmpul de editare al subiectului camerei nu a fost găsit în DOM.');
      return;
    }

    try {
      subjectInput.focus();
      subjectInput.value = newSubject;
      subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
      subjectInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Caută butonul de salvare (Save / Update / Submit)
      const saveBtn = 
        document.querySelector('#save_room_subject_button') ||
        document.querySelector('#submit_subject') ||
        document.querySelector('button[data-action="save-subject"]') ||
        subjectInput.form?.querySelector('button[type="submit"]') ||
        subjectInput.form?.querySelector('input[type="submit"]') ||
        subjectInput.parentElement?.querySelector('button');

      if (saveBtn) {
        saveBtn.click();
        console.log('[GlowBot Auto-Goal] Subiectul camerei a fost salvat prin click pe butonul de salvare.');
      } else {
        const enterEvt = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        subjectInput.dispatchEvent(enterEvt);
        console.log('[GlowBot Auto-Goal] S-a simulat tasta Enter pe input-ul de subiect.');
      }
    } catch (err) {
      console.error('[GlowBot Auto-Goal] Eroare la actualizarea automată a subiectului:', err);
    }
  }

  /**
   * Parsează un mesaj de chat obișnuit cu selectori de fallback
   */
  function parseRegularChatMessage(node, text) {
    const userEl = node.querySelector('.username, [data-username], a.user, span.user, a');
    if (!userEl) return null;

    const username = userEl.textContent.trim();
    if (!username) return null;

    // Detectează nivelul de badge al utilizatorului
    let userLevel = 'regular';
    if (node.querySelector('.broadcaster, .is_broadcaster')) userLevel = 'broadcaster';
    else if (node.querySelector('.mod, .moderator')) userLevel = 'mod';
    else if (node.querySelector('.fanclub')) userLevel = 'fanclub';
    else if (node.querySelector('.dark_blue, .has_tokens_dark_blue')) userLevel = 'dark_blue';
    else if (node.querySelector('.purple, .has_tokens_purple')) userLevel = 'purple';
    else if (node.querySelector('.light_blue, .has_tokens_light_blue')) userLevel = 'light_blue';

    return {
      sender: username,
      text: text.replace(username, '').trim(),
      userLevel
    };
  }

  /**
   * Gestionează un mesaj normal de chat
   */
  function handleChatMessage(chat) {
    if (state.settings.enableAutoWelcome && !state.welcomedUsers.has(chat.sender)) {
      state.welcomedUsers.add(chat.sender);

      const isHighTier = ['dark_blue', 'purple', 'fanclub', 'mod'].includes(chat.userLevel);
      if (!state.settings.autoWelcomeVipOnly || isHighTier) {
        const welcomeMsg = state.settings.autoWelcomeTemplate.replace(/{user}/gi, chat.sender);
        setTimeout(() => {
          sendChatMessageToRoom(welcomeMsg);
        }, 2000);
      }
    }

    if (['broadcaster', 'mod', 'dark_blue', 'purple', 'fanclub'].includes(chat.userLevel)) {
      sendToBackground({
        type: 'chat_message',
        model: state.modelUsername,
        timestamp: new Date().toISOString(),
        data: {
          sender: chat.sender,
          message: chat.text,
          userLevel: chat.userLevel
        }
      });
    }
  }

  /**
   * Observer pentru statusul camerei
   */
  function startStatusObserver() {
    let lastSubject = '';
    statusIntervalId = setInterval(() => {
      const subjectEl = document.querySelector('#room_subject, .room-subject, [data-testid="room-subject"]');
      if (subjectEl) {
        const currentSubject = subjectEl.textContent.trim();
        if (currentSubject && currentSubject !== lastSubject) {
          lastSubject = currentSubject;
          sendToBackground({
            type: 'status_change',
            model: state.modelUsername,
            timestamp: new Date().toISOString(),
            data: { roomSubject: currentSubject }
          });
        }
      }

      const viewersEl = document.querySelector('#chat_room_viewers_count, .viewers-count');
      if (viewersEl) {
        const count = parseInt(viewersEl.textContent.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(count)) {
          updateHudViewers(count);
        }
      }
    }, 10000);
  }

  /**
   * Injectează și trimite un mesaj direct în chatul Chaturbate
   */
  function sendChatMessageToRoom(messageText) {
    if (!messageText) return;

    const chatInput = 
      document.querySelector('#chat_message_input') ||
      document.querySelector('textarea.chat-input') ||
      document.querySelector('input.chat-input') ||
      document.querySelector('[data-testid="chat-input"]');

    if (!chatInput) {
      console.warn('[GlowBot] Nu s-a putut găsi caseta de introducere a mesajului de chat.');
      return;
    }

    try {
      chatInput.focus();
      chatInput.value = messageText;

      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      chatInput.dispatchEvent(new Event('change', { bubbles: true }));

      const sendBtn = 
        document.querySelector('#chat_message_send_button') ||
        document.querySelector('button[type="submit"]') ||
        document.querySelector('[data-testid="chat-send-button"]') ||
        chatInput.form?.querySelector('button');

      if (sendBtn) {
        sendBtn.click();
      } else {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        chatInput.dispatchEvent(enterEvent);
      }

      console.log('[GlowBot] Mesaj trimis automat în chat:', messageText);
    } catch (e) {
      console.error('[GlowBot] Eroare la trimiterea mesajului în chat:', e);
    }
  }

  /**
   * Trimite evenimentul capturat către Service Worker
   */
  function sendToBackground(eventPayload) {
    try {
      chrome.runtime.sendMessage({
        type: 'EVENT_CAPTURED',
        payload: eventPayload
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[GlowBot] Communication warning:', chrome.runtime.lastError.message);
        }
      });
    } catch (e) {
      console.warn('[GlowBot] Runtime not available:', e);
    }
  }

  /**
   * Creează un mic HUD plutitor pe ecranul modelului
   */
  let hudEl = null;
  function createOnScreenHud() {
    if (document.querySelector('#glowbot_hud')) return;

    hudEl = document.createElement('div');
    hudEl.id = 'glowbot_hud';
    hudEl.style.cssText = \`
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: rgba(15, 17, 26, 0.92);
      color: #fff;
      padding: 10px 14px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      border: 1px solid rgba(255, 64, 129, 0.4);
      display: flex;
      align-items: center;
      gap: 12px;
      backdrop-filter: blur(8px);
      user-select: none;
      cursor: pointer;
      transition: transform 0.2s ease;
    \`;

    hudEl.innerHTML = \`
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="width:8px; height:8px; background:#00e676; border-radius:50%; box-shadow:0 0 8px #00e676;"></span>
        <span style="font-weight:700; color:#ff4081; letter-spacing:0.5px;">GLOWBOT</span>
      </div>
      <div style="height:14px; width:1px; background:rgba(255,255,255,0.2);"></div>
      <div style="display:flex; gap:10px;">
        <span>💰 <strong id="glowbot_hud_tokens" style="color:#ffd700;">0</strong> tk</span>
        <span>⚡ <strong id="glowbot_hud_tips">0</strong> tips</span>
      </div>
    \`;

    hudEl.title = 'GlowBot este activ și monitorizează camera broadcaster (/b/).';
    document.body.appendChild(hudEl);
  }

  function updateHud() {
    if (!hudEl) return;
    const tokensEl = hudEl.querySelector('#glowbot_hud_tokens');
    const tipsEl = hudEl.querySelector('#glowbot_hud_tips');
    if (tokensEl) tokensEl.textContent = state.sessionTokens;
    if (tipsEl) tipsEl.textContent = state.sessionTipsCount;
  }

  function updateHudViewers(count) {
    // Opțional actualizare spectatori în HUD
  }

  /**
   * Notificare Toast stilizată pe ecran pentru evenimente cheie
   */
  function showToastNotification(title, subtitle) {
    const toast = document.createElement('div');
    toast.style.cssText = \`
      position: fixed;
      top: 30px;
      right: 30px;
      z-index: 9999999;
      background: linear-gradient(135deg, #1e102f, #110d1a);
      border: 1px solid #ff4081;
      border-radius: 12px;
      padding: 12px 18px;
      color: #fff;
      font-family: -apple-system, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      transform: translateX(120%);
      transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      display: flex;
      flex-direction: column;
      gap: 2px;
    \`;
    toast.innerHTML = \`
      <div style="font-size:14px; font-weight:700; color:#ffd700;">\${title}</div>
      <div style="font-size:11px; color:#ccc;">\${subtitle}</div>
    \`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
})();
`;

export const POPUP_HTML = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GlowBot Control Panel</title>
  <style>
    :root {
      --bg: #000000;
      --panel: #0a0a0c;
      --card: rgba(18, 18, 23, 0.75);
      --card-hover: rgba(25, 25, 33, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(255, 255, 255, 0.22);
      --text: #ededed;
      --text-muted: #888888;
      --text-subtle: #555555;
      --primary: #ffffff;
      --primary-text: #000000;
      --accent: #ff0055;
      --accent-glow: rgba(255, 0, 85, 0.25);
      --success: #00e599;
      --success-glow: rgba(0, 229, 153, 0.35);
      --error: #ff3344;
      --error-glow: rgba(255, 51, 68, 0.35);
      --warning: #f5a623;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      width: 375px;
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(255, 0, 85, 0.08) 0%, transparent 65%),
        radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.03) 0%, transparent 50%);
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.5;
      padding: 18px 16px 20px;
      -webkit-font-smoothing: antialiased;
      user-select: none;
    }

    /* Header cu status dot & tooltip Vercel style */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.6px;
      padding: 2px 7px;
      border-radius: 9999px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border);
      color: var(--text);
    }

    .brand-name {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: #fff;
    }

    /* Status Pill cu Tooltip */
    .status-container {
      position: relative;
      display: inline-flex;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      border-radius: 9999px;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: border-color 0.2s, background 0.2s;
    }

    .status-pill:hover {
      border-color: var(--border-focus);
      background: rgba(255, 255, 255, 0.07);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #555;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .status-dot.connected {
      background: var(--success);
      box-shadow: 0 0 10px var(--success-glow);
    }

    .status-dot.disconnected, .status-dot.error {
      background: var(--error);
      box-shadow: 0 0 10px var(--error-glow);
    }

    .status-dot.syncing {
      background: var(--warning);
      animation: pulseSync 1.2s infinite ease-in-out;
    }

    @keyframes pulseSync {
      0%, 100% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.15); box-shadow: 0 0 12px rgba(245, 166, 35, 0.6); }
    }

    .status-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
    }

    /* Tooltip elegant */
    .tooltip {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: rgba(14, 14, 18, 0.95);
      border: 1px solid var(--border-focus);
      color: var(--text);
      font-size: 11px;
      padding: 5px 9px;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-4px);
      transition: opacity 0.2s, transform 0.2s;
      z-index: 50;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      backdrop-filter: blur(12px);
    }

    .status-container:hover .tooltip {
      opacity: 1;
      transform: translateY(0);
    }

    /* Carduri modulare Vercel Style */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 13px;
      margin-bottom: 12px;
      backdrop-filter: blur(14px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      transition: border-color 0.2s ease;
    }

    .card:hover {
      border-color: rgba(255, 255, 255, 0.12);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .card-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
    }

    /* Grilă de metrici sincronizare */
    .metric-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }

    .metric-cell {
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 9px 10px;
      text-align: left;
    }

    .metric-num {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }

    .metric-name {
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted);
      margin-top: 3px;
    }

    /* Formulare & Câmpuri */
    .form-group {
      margin-bottom: 11px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    label {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: #d1d5db;
      margin-bottom: 5px;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    input[type="text"], input[type="password"], input[type="number"] {
      width: 100%;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 8px 11px;
      color: #ffffff;
      font-family: inherit;
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input[type="text"]:focus, input[type="password"]:focus, input[type="number"]:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
    }

    .toggle-pass {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      padding: 3px 6px;
      border-radius: 4px;
      transition: color 0.2s;
    }

    .toggle-pass:hover {
      color: #fff;
    }

    /* Switch Toggles */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .toggle-row:last-child {
      border-bottom: none;
    }

    .toggle-info-title {
      font-weight: 500;
      font-size: 12px;
      color: #ffffff;
    }

    .toggle-info-desc {
      font-size: 10px;
      color: var(--text-muted);
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 34px;
      height: 18px;
      flex-shrink: 0;
    }

    .switch input { opacity: 0; width: 0; height: 0; }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #27272a;
      transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 18px;
      border: 1px solid var(--border);
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 12px;
      width: 12px;
      left: 2px;
      bottom: 2px;
      background-color: #a1a1aa;
      transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #ffffff;
      border-color: #ffffff;
    }

    input:checked + .slider:before {
      transform: translateX(16px);
      background-color: #000000;
    }

    /* Butoane */
    button {
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
      border: none;
    }

    .btn-action {
      background: #ffffff;
      color: #000000;
      padding: 9px 14px;
      font-weight: 600;
      width: 100%;
      box-shadow: 0 2px 10px rgba(255, 255, 255, 0.1);
    }

    .btn-action:hover:not(:disabled) {
      background: #e8e8e8;
      box-shadow: 0 4px 16px rgba(255, 255, 255, 0.18);
    }

    .btn-action:disabled {
      background: #27272a;
      color: #71717a;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 7px 11px;
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.09);
      border-color: var(--border-focus);
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid transparent;
      padding: 4px 8px;
      font-size: 11px;
    }

    .btn-ghost:hover {
      color: #ffffff;
      border-color: var(--border);
    }

    .btn-row {
      display: flex;
      gap: 8px;
    }

    /* Spinner CSS Modern */
    .spinner {
      width: 13px;
      height: 13px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.65s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Inline Test Result Box */
    #test-result-box {
      display: none;
      margin-top: 8px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      line-height: 1.4;
      animation: fadeIn 0.2s ease;
    }

    #test-result-box.success {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 229, 153, 0.1);
      border: 1px solid rgba(0, 229, 153, 0.3);
      color: #a7f3d0;
    }

    #test-result-box.error {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 51, 68, 0.1);
      border: 1px solid rgba(255, 51, 68, 0.3);
      color: #fca5a5;
    }

    #error-banner {
      display: none;
      background: rgba(255, 51, 68, 0.1);
      border: 1px solid rgba(255, 51, 68, 0.25);
      color: #fca5a5;
      font-size: 11px;
      padding: 8px 11px;
      border-radius: var(--radius-sm);
      margin-bottom: 12px;
      word-break: break-word;
    }

    /* Toast Notificare */
    #toast {
      position: fixed;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%) translateY(40px);
      background: rgba(18, 18, 23, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-weight: 500;
      font-size: 11px;
      padding: 6px 14px;
      border-radius: 9999px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      backdrop-filter: blur(12px);
      transition: transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.2s;
      pointer-events: none;
      opacity: 0;
      z-index: 1000;
    }

    #toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-2px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand-wrap">
      <span class="brand-name">GlowBot</span>
      <span class="logo-badge">PRO V1</span>
    </div>

    <!-- Indicator vizual de stare cu Tooltip -->
    <div class="status-container" id="status-container">
      <div class="status-pill">
        <div class="status-dot" id="status-dot"></div>
        <span class="status-label" id="status-text">Deconectat</span>
      </div>
      <div class="tooltip" id="status-tooltip">Ultima sincronizare: Niciuna</div>
    </div>
  </header>

  <div id="error-banner"></div>

  <!-- Card Status Coadă & Sincronizare -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">Sincronizare Coadă</span>
      <button id="btn-refresh" class="btn-ghost" title="Reîmprospătează starea">↻ Reîmprospătare</button>
    </div>
    <div class="metric-grid">
      <div class="metric-cell">
        <div class="metric-num" id="stat-queue">0</div>
        <div class="metric-name">Evenimente în Coadă</div>
      </div>
      <div class="metric-cell">
        <div class="metric-num" id="stat-retries">0</div>
        <div class="metric-name">Reîncercări Active</div>
      </div>
    </div>
    <div class="btn-row">
      <button id="btn-flush" class="btn-secondary" style="flex: 1;">Trimite Coada Acum</button>
      <button id="btn-clear-queue" class="btn-secondary">Golește Coada</button>
    </div>
  </div>

  <!-- Card Autentificare & Endpoint -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">Securitate & Conexiune</span>
    </div>
    <div class="form-group">
      <label for="bot-token">Bot Token Secret <span style="color:var(--accent);">*</span></label>
      <div class="input-wrap">
        <input type="password" id="bot-token" placeholder="Introduceți cheia secretă de autentificare...">
        <button type="button" class="toggle-pass" id="btn-toggle-token">Arată</button>
      </div>
    </div>
    <div class="form-group">
      <label for="backend-url">Endpoint Backend</label>
      <input type="text" id="backend-url" placeholder="https://glowbby.online/v1/bot/event">
    </div>

    <!-- Buton Test cu Spinner și Result Box fără alert() -->
    <button id="btn-test-conn" class="btn-secondary" style="width: 100%; margin-top: 6px;">
      <span id="btn-test-text">⚡ Testează Conexiunea</span>
    </button>
    <div id="test-result-box"></div>
  </div>

  <!-- Card Automatizări Chaturbate -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">Automatizări Cameră</span>
    </div>

    <div class="toggle-row">
      <div>
        <div class="toggle-info-title">Tracking Bacșișuri Live</div>
        <div class="toggle-info-desc">Capturează donațiile din DOM (#chat_text_list)</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="toggle-tips" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="toggle-row">
      <div>
        <div class="toggle-info-title">VIP Chat Highlight</div>
        <div class="toggle-info-desc">Contur auriu & efect vizual 5s pe mesajul VIP</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="toggle-vip" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="form-group" style="margin-top: 8px;">
      <label for="vip-threshold">Prag Minim VIP (Token-uri)</label>
      <input type="number" id="vip-threshold" value="100" min="1" max="10000">
    </div>

    <div class="toggle-row" style="margin-top: 6px;">
      <div>
        <div class="toggle-info-title">Auto-Mulțumire Chat</div>
        <div class="toggle-info-desc">Transmite automat mulțumire în cameră</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="toggle-auto-thank" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="form-group" style="margin-top: 8px;">
      <label for="thank-template">Șablon Mesaj Mulțumire</label>
      <input type="text" id="thank-template" value="Mulțumesc mult, {user}, pentru cele {tokens} token-uri! ❤️">
    </div>

    <div class="toggle-row" style="margin-top: 6px;">
      <div>
        <div class="toggle-info-title">Auto-Welcome Vizitatori</div>
        <div class="toggle-info-desc">Mesaj de întâmpinare când intră utilizatori</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="toggle-auto-welcome">
        <span class="slider"></span>
      </label>
    </div>

    <div class="toggle-row" style="margin-top: 6px;">
      <div>
        <div class="toggle-info-title">Auto-Goal Subject Update</div>
        <div class="toggle-info-desc">Modifică automat Room Subject la atingerea goal-ului</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="toggle-auto-goal" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="form-group" style="margin-top: 8px;">
      <label for="goal-threshold">Prag Goal Sesiune (Token-uri)</label>
      <input type="number" id="goal-threshold" value="500" min="10" max="100000">
    </div>

    <div class="form-group" style="margin-top: 8px;">
      <label for="goal-subject-template">Mesaj Subject la atingerea goal-ului</label>
      <input type="text" id="goal-subject-template" value="🎯 GOAL REACHED! Următorul goal: {nextGoal}tk | Mulțumiri tuturor!">
    </div>

    <div class="toggle-row" style="margin-top: 6px;">
      <div>
        <div class="toggle-info-title">HUD Discret pe Ecran</div>
        <div class="toggle-info-desc">Widget minimalist suprapus în transmisiune</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="toggle-hud" checked>
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <!-- Buton Principal de Salvare (Disabled dacă bot-token este gol) -->
  <button id="btn-save" class="btn-action" disabled>
    Salvează Toate Setările
  </button>

  <div id="toast">Setările au fost salvate!</div>

  <script src="popup.js"></script>
</body>
</html>
`;

export const POPUP_JS = `/**
 * GlowBot - Modern Popup Controller (Vercel/Tailwind UI Dark Mode)
 * Sincronizează interfața de utilizator cu chrome.storage.local și Background Service Worker
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elemente DOM Formular
  const botTokenInput = document.getElementById('bot-token');
  const backendUrlInput = document.getElementById('backend-url');
  const toggleTips = document.getElementById('toggle-tips');
  const toggleVip = document.getElementById('toggle-vip');
  const vipThresholdInput = document.getElementById('vip-threshold');
  const toggleAutoThank = document.getElementById('toggle-auto-thank');
  const thankTemplateInput = document.getElementById('thank-template');
  const toggleAutoWelcome = document.getElementById('toggle-auto-welcome');
  const toggleAutoGoal = document.getElementById('toggle-auto-goal');
  const goalThresholdInput = document.getElementById('goal-threshold');
  const goalSubjectTemplateInput = document.getElementById('goal-subject-template');
  const toggleHud = document.getElementById('toggle-hud');

  // Butoane de acțiune
  const btnSave = document.getElementById('btn-save');
  const btnToggleToken = document.getElementById('btn-toggle-token');
  const btnTestConn = document.getElementById('btn-test-conn');
  const btnTestText = document.getElementById('btn-test-text');
  const testResultBox = document.getElementById('test-result-box');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnFlush = document.getElementById('btn-flush');
  const btnClearQueue = document.getElementById('btn-clear-queue');

  // Elemente de Stare & Metrici
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const statusTooltip = document.getElementById('status-tooltip');
  const statQueue = document.getElementById('stat-queue');
  const statRetries = document.getElementById('stat-retries');
  const errorBanner = document.getElementById('error-banner');
  const toast = document.getElementById('toast');

  let lastSyncTimestamp = null;

  // 1. Validare dinamică a input-urilor (btnSave disabled dacă bot-token este gol)
  function validateForm() {
    const hasToken = botTokenInput.value.trim().length > 0;
    btnSave.disabled = !hasToken;
    if (!hasToken) {
      btnSave.title = 'Introduceți un Bot Token pentru a putea salva setările';
    } else {
      btnSave.title = 'Salvează toate setările';
    }
  }

  botTokenInput.addEventListener('input', () => {
    validateForm();
    updateQueueStatusUI();
  });

  // 2. Încarcă setările salvate din chrome.storage.local
  const store = await chrome.storage.local.get('glowbot_settings');
  const s = store.glowbot_settings || {};

  botTokenInput.value = s.botToken || '';
  backendUrlInput.value = s.backendUrl || 'https://glowbby.online/v1/bot/event';
  toggleTips.checked = s.enableTipTracking !== false;
  toggleVip.checked = s.enableVipDetection !== false;
  vipThresholdInput.value = s.vipThreshold || 100;
  toggleAutoThank.checked = s.enableAutoThank !== false;
  thankTemplateInput.value = s.autoThankTemplate || 'Mulțumesc mult, {user}, pentru cele {tokens} token-uri! ❤️';
  toggleAutoWelcome.checked = !!s.enableAutoWelcome;
  toggleAutoGoal.checked = s.enableAutoGoalSubject !== false;
  goalThresholdInput.value = s.goalTokensThreshold || 500;
  goalSubjectTemplateInput.value = s.goalReachedSubjectTemplate || '🎯 GOAL REACHED! Următorul goal: {nextGoal}tk | Mulțumiri tuturor!';
  toggleHud.checked = s.enableOnScreenHud !== false;

  // Verificare inițială a validării
  validateForm();

  // 3. Stare inițială a cozii și polling periodic
  updateQueueStatusUI();
  const pollInterval = setInterval(updateQueueStatusUI, 3000);
  window.addEventListener('unload', () => clearInterval(pollInterval));

  // Toggle afișare/ascundere Bot Token
  btnToggleToken.addEventListener('click', () => {
    if (botTokenInput.type === 'password') {
      botTokenInput.type = 'text';
      btnToggleToken.textContent = 'Ascunde';
    } else {
      botTokenInput.type = 'password';
      btnToggleToken.textContent = 'Arată';
    }
  });

  // Salvare setări
  btnSave.addEventListener('click', async () => {
    if (btnSave.disabled) return;

    const updatedSettings = {
      botToken: botTokenInput.value.trim(),
      backendUrl: backendUrlInput.value.trim(),
      enableTipTracking: toggleTips.checked,
      enableVipDetection: toggleVip.checked,
      vipThreshold: parseInt(vipThresholdInput.value, 10) || 100,
      enableAutoThank: toggleAutoThank.checked,
      autoThankTemplate: thankTemplateInput.value,
      autoThankMinTokens: 10,
      enableAutoWelcome: toggleAutoWelcome.checked,
      autoWelcomeTemplate: 'Bine ai venit, @{user}! ✨',
      enableAutoGoalSubject: toggleAutoGoal.checked,
      goalTokensThreshold: parseInt(goalThresholdInput.value, 10) || 500,
      goalReachedSubjectTemplate: goalSubjectTemplateInput.value.trim(),
      enableOnScreenHud: toggleHud.checked
    };

    await chrome.storage.local.set({ glowbot_settings: updatedSettings });
    showToast('Setările au fost salvate cu succes!');
    updateQueueStatusUI();
  });

  // Test conexiune fără alert() - folosește spinner CSS și inline result box
  btnTestConn.addEventListener('click', async () => {
    const token = botTokenInput.value.trim();
    const url = backendUrlInput.value.trim();

    if (!token) {
      showInlineTestResult(false, 'Introduceți mai întâi un Bot Token valid.');
      return;
    }

    // Setare stare de încărcare (spinner)
    btnTestConn.disabled = true;
    btnTestText.innerHTML = '<span class="spinner"></span> Se verifică conexiunea...';
    testResultBox.style.display = 'none';

    chrome.runtime.sendMessage({
      type: 'TEST_BACKEND_CONNECTION',
      payload: {
        botToken: token,
        backendUrl: url
      }
    }, (res) => {
      btnTestConn.disabled = false;
      btnTestText.textContent = '⚡ Testează Conexiunea';

      if (res && res.success) {
        showInlineTestResult(true, 'Conexiune reușită! Serverul a validat token-ul.');
        errorBanner.style.display = 'none';
        updateQueueStatusUI();
      } else {
        const errorMsg = res?.message || 'Nu s-a putut stabili conexiunea cu serverul.';
        showInlineTestResult(false, errorMsg);
      }
    });
  });

  function showInlineTestResult(isSuccess, message) {
    testResultBox.className = isSuccess ? 'success' : 'error';
    testResultBox.innerHTML = \`
      <span>\${isSuccess ? '✓' : '✕'}</span>
      <span>\${message}</span>
    \`;
    testResultBox.style.display = 'flex';
  }

  // Sincronizare forțată coadă
  btnFlush.addEventListener('click', () => {
    btnFlush.disabled = true;
    btnFlush.textContent = 'Se trimite...';
    chrome.runtime.sendMessage({ type: 'TRIGGER_SYNC_NOW' }, () => {
      btnFlush.disabled = false;
      btnFlush.textContent = 'Trimite Coada Acum';
      showToast('Coada a fost sincronizată.');
      updateQueueStatusUI();
    });
  });

  // Golire coadă
  btnClearQueue.addEventListener('click', () => {
    if (confirm('Ești sigur că vrei să ștergi toate evenimentele din coadă?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_QUEUE' }, () => {
        showToast('Coada locală a fost golită.');
        updateQueueStatusUI();
      });
    }
  });

  btnRefresh.addEventListener('click', () => {
    btnRefresh.textContent = '↻ ...';
    updateQueueStatusUI();
    setTimeout(() => { btnRefresh.textContent = '↻ Reîmprospătare'; }, 400);
  });

  // Formatează timpul relativ ('acum X minute')
  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Ultima sincronizare: Niciuna încă';
    const now = Date.now();
    const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

    if (diffSeconds < 60) {
      return 'Ultima sincronizare: chiar acum';
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes === 1) {
      return 'Ultima sincronizare: acum 1 minut';
    }
    if (diffMinutes < 60) {
      return \`Ultima sincronizare: acum \${diffMinutes} minute\`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    return \`Ultima sincronizare: acum \${diffHours} ore\`;
  }

  /**
   * Actualizează UI-ul pe baza stării din Background Service Worker
   */
  function updateQueueStatusUI() {
    chrome.runtime.sendMessage({ type: 'GET_QUEUE_STATUS' }, (res) => {
      if (!res) return;

      statQueue.textContent = res.queueLength ?? 0;
      statRetries.textContent = res.retryCount ?? 0;

      if (res.lastSync) {
        lastSyncTimestamp = new Date(res.lastSync).getTime();
      }

      // Actualizare text tooltip relativ
      statusTooltip.textContent = formatRelativeTime(lastSyncTimestamp);

      const hasBotToken = botTokenInput.value.trim().length > 0;

      if (res.lastError) {
        errorBanner.textContent = '⚠️ ' + res.lastError;
        errorBanner.style.display = 'block';
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Eroare conexiune';
      } else if (res.isSyncing) {
        errorBanner.style.display = 'none';
        statusDot.className = 'status-dot syncing';
        statusText.textContent = 'Sincronizare...';
      } else if (hasBotToken) {
        errorBanner.style.display = 'none';
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Conectat';
      } else {
        errorBanner.style.display = 'none';
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Deconectat';
      }
    });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
});
`;

export const SERVER_JS_SNIPPET = `/**
 * =========================================================================
 * GLOWBOT BACKEND INTEGRATION FOR server.js
 * Tehnologii: Express.js + better-sqlite3
 * Suportă: Autentificare Bearer Token, Validare Evenimente, Coadă Batch,
 * Tranzacții SQLite de mare viteză și Actualizare Statistici Tippers.
 * =========================================================================
 */

const Database = require('better-sqlite3');
const path = require('path');

// 1. Inițializare bază de date SQLite (cu modul WAL pentru performanță ridicată în concurență)
const db = new Database(path.join(__dirname, 'glowbot_database.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// 2. Creare tabele necesare (se execută automat la pornirea serverului)
db.exec(\`
  -- Tabela de Token-uri pentru Modele
  CREATE TABLE IF NOT EXISTS bot_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    model_username TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabela de Evenimente (Tips, Chat, Schimbări Status)
  CREATE TABLE IF NOT EXISTS bot_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    model_username TEXT NOT NULL,
    sender_username TEXT,
    amount_tokens INTEGER DEFAULT 0,
    message TEXT,
    is_vip INTEGER DEFAULT 0,
    raw_payload TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabela Agregată: Clasament Suporteri (Top Tippers)
  CREATE TABLE IF NOT EXISTS tipper_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_username TEXT NOT NULL,
    tipper_username TEXT NOT NULL,
    total_tokens INTEGER DEFAULT 0,
    tip_count INTEGER DEFAULT 0,
    is_vip INTEGER DEFAULT 0,
    last_tip_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_username, tipper_username)
  );

  -- Tabela Reguli de Automatizare Răspuns Chat (Automation Rules)
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

  -- Indexuri pentru interogări ultra-rapide
  CREATE INDEX IF NOT EXISTS idx_events_model_type ON bot_events(model_username, event_type);
  CREATE INDEX IF NOT EXISTS idx_tipper_model ON tipper_stats(model_username, total_tokens DESC);
  CREATE INDEX IF NOT EXISTS idx_rules_model ON rules(model_username, is_active);
\`);

// Inserează un token demonstrativ/master dacă tabela este goală (opțional)
const countTokens = db.prepare('SELECT COUNT(*) as count FROM bot_tokens').get();
if (countTokens.count === 0) {
  db.prepare(\`
    INSERT INTO bot_tokens (token, model_username, is_active)
    VALUES (?, ?, 1)
  \`).run('glw_sec_89dfa47b19283f', 'my_top_model');
  console.log('[GlowBot Backend] S-a generat token demo inițial: glw_sec_89dfa47b19283f');
}

/**
 * 3. Middleware de Autentificare prin Bot Token (Header: Authorization: Bearer <TOKEN>)
 */
const selectTokenStmt = db.prepare(\`
  SELECT id, token, model_username, is_active 
  FROM bot_tokens 
  WHERE token = ? AND is_active = 1
\`);

function authenticateBotToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Autentificare eșuată: Header-ul Authorization: Bearer <BOT_TOKEN> lipsește.'
    });
  }

  const token = authHeader.split(' ')[1]?.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token invalid sau format necorespunzător.'
    });
  }

  try {
    const modelRecord = selectTokenStmt.get(token);

    if (!modelRecord) {
      return res.status(403).json({
        success: false,
        error: 'Token neautorizat sau inactiv în sistem.'
      });
    }

    // Atașăm datele modelului la obiectul request
    req.botModel = modelRecord;
    next();
  } catch (err) {
    console.error('[GlowBot Auth Error]', err);
    return res.status(500).json({ success: false, error: 'Eroare internă de verificare token.' });
  }
}

/**
 * 4. Prepared Statements pentru salvarea eficientă în SQLite
 */
const insertEventStmt = db.prepare(\`
  INSERT INTO bot_events (event_type, model_username, sender_username, amount_tokens, message, is_vip, raw_payload)
  VALUES (@event_type, @model_username, @sender_username, @amount_tokens, @message, @is_vip, @raw_payload)
\`);

const upsertTipperStmt = db.prepare(\`
  INSERT INTO tipper_stats (model_username, tipper_username, total_tokens, tip_count, is_vip, last_tip_at)
  VALUES (@model, @tipper, @tokens, 1, @is_vip, CURRENT_TIMESTAMP)
  ON CONFLICT(model_username, tipper_username) DO UPDATE SET
    total_tokens = total_tokens + excluded.total_tokens,
    tip_count = tip_count + 1,
    is_vip = CASE WHEN (total_tokens + excluded.total_tokens) >= 100 THEN 1 ELSE is_vip END,
    last_tip_at = CURRENT_TIMESTAMP
\`);

/**
 * 5. Tranzacție SQLite pentru procesarea unui batch de evenimente fără overhead
 */
const processEventsTransaction = db.transaction((events, modelName) => {
  let savedCount = 0;

  for (const evt of events) {
    if (!evt || !evt.type) continue;

    const eventType = evt.type;
    const model = modelName || evt.model || 'unknown';
    const data = evt.data || {};

    const tipper = data.tipper || data.sender || null;
    const tokens = parseInt(data.tokens, 10) || 0;
    const message = data.message || null;
    const isVip = data.isVip ? 1 : (tokens >= 100 ? 1 : 0);

    // Salvează evenimentul brut
    insertEventStmt.run({
      event_type: eventType,
      model_username: model,
      sender_username: tipper,
      amount_tokens: tokens,
      message: message,
      is_vip: isVip,
      raw_payload: JSON.stringify(evt)
    });

    // Dacă este tip, actualizează clasamentul
    if (eventType === 'tip' && tipper && tokens > 0) {
      upsertTipperStmt.run({
        model: model,
        tipper: tipper,
        tokens: tokens,
        is_vip: isVip
      });
    }

    savedCount++;
  }

  return savedCount;
});

/**
 * 6. ENDPOINT PRINCIPAL: POST /v1/bot/event
 * Suportă atât eveniment individual, cât și batch de evenimente din coada extensiei
 */
app.post('/v1/bot/event', authenticateBotToken, async (req, res) => {
  try {
    const { batch, type, model, data, timestamp } = req.body;
    const modelName = req.botModel.model_username;

    let eventsToProcess = [];

    // Verifică dacă este un batch sau un singur eveniment
    if (Array.isArray(batch) && batch.length > 0) {
      eventsToProcess = batch;
    } else if (type) {
      eventsToProcess = [{ type, model, data, timestamp }];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Payload invalid: Este necesar un obiect event sau un array batch.'
      });
    }

    // Rulare tranzacție atomică în SQLite
    const processedCount = processEventsTransaction(eventsToProcess, modelName);

    console.log(\`[GlowBot Event] S-au salvat cu succes \${processedCount} evenimente pentru modelul: \${modelName}\`);

    return res.status(200).json({
      success: true,
      processed: processedCount,
      model: modelName,
      server_time: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GlowBot Event Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Eroare la procesarea și salvarea evenimentelor în baza de date.',
      details: error.message
    });
  }
});

/**
 * 7. ENDPOINT OPȚIONAL: GET /v1/bot/stats
 * Returnează statistici agregate pentru tabloul de bord al modelului
 */
app.get('/v1/bot/stats', authenticateBotToken, (req, res) => {
  try {
    const model = req.botModel.model_username;

    // Total tokens azi
    const totals = db.prepare(\`
      SELECT 
        COALESCE(SUM(amount_tokens), 0) as total_tokens,
        COUNT(*) as total_tips
      FROM bot_events 
      WHERE model_username = ? AND event_type = 'tip'
      AND DATE(received_at) = DATE('now')
    \`).get(model);

    // Top 10 suporteri
    const topTippers = db.prepare(\`
      SELECT tipper_username, total_tokens, tip_count, is_vip, last_tip_at
      FROM tipper_stats
      WHERE model_username = ?
      ORDER BY total_tokens DESC
      LIMIT 10
    \`).all(model);

    res.json({
      success: true,
      model,
      today: totals,
      topTippers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. ENDPOINT-URI PENTRU REGULI DE AUTOMATIZARE CHAT (rules)
 */
// GET /v1/bot/rules - Returnează regulile active pentru modelul autentificat
app.get('/v1/bot/rules', authenticateBotToken, (req, res) => {
  try {
    const model = req.botModel.model_username;
    const rules = db.prepare(\`
      SELECT id, trigger_keyword, match_type, response_message, delay_seconds, is_active, min_user_level, hits_count
      FROM rules
      WHERE model_username = ?
      ORDER BY id DESC
    \`).all(model);

    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /v1/bot/rules - Creează sau actualizează o regulă
app.post('/v1/bot/rules', authenticateBotToken, (req, res) => {
  try {
    const model = req.botModel.model_username;
    const { id, trigger_keyword, match_type, response_message, delay_seconds, is_active, min_user_level } = req.body;

    if (!trigger_keyword || !response_message) {
      return res.status(400).json({ success: false, error: 'Câmpurile trigger_keyword și response_message sunt obligatorii.' });
    }

    if (id) {
      db.prepare(\`
        UPDATE rules
        SET trigger_keyword = ?, match_type = ?, response_message = ?, delay_seconds = ?, is_active = ?, min_user_level = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND model_username = ?
      \`).run(trigger_keyword, match_type || 'contains', response_message, delay_seconds || 1.0, is_active !== false ? 1 : 0, min_user_level || 'all', id, model);
      return res.json({ success: true, message: 'Regula a fost actualizată.' });
    } else {
      const result = db.prepare(\`
        INSERT INTO rules (model_username, trigger_keyword, match_type, response_message, delay_seconds, is_active, min_user_level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      \`).run(model, trigger_keyword, match_type || 'contains', response_message, delay_seconds || 1.0, is_active !== false ? 1 : 0, min_user_level || 'all');
      return res.json({ success: true, id: result.lastInsertRowid, message: 'Regulă nouă creată.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /v1/bot/rules/:id - Șterge o regulă
app.delete('/v1/bot/rules/:id', authenticateBotToken, (req, res) => {
  try {
    const model = req.botModel.model_username;
    db.prepare('DELETE FROM rules WHERE id = ? AND model_username = ?').run(req.params.id, model);
    res.json({ success: true, message: 'Regula a fost ștearsă.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
`;

export const SCHEMA_SQL = `-- Schema completă SQLite pentru GlowBot
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS bot_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  model_username TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  model_username TEXT NOT NULL,
  sender_username TEXT,
  amount_tokens INTEGER DEFAULT 0,
  message TEXT,
  is_vip INTEGER DEFAULT 0,
  raw_payload TEXT,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tipper_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_username TEXT NOT NULL,
  tipper_username TEXT NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  tip_count INTEGER DEFAULT 0,
  is_vip INTEGER DEFAULT 0,
  last_tip_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_username, tipper_username)
);

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

CREATE INDEX IF NOT EXISTS idx_events_model_type ON bot_events(model_username, event_type);
CREATE INDEX IF NOT EXISTS idx_tipper_model ON tipper_stats(model_username, total_tokens DESC);
CREATE INDEX IF NOT EXISTS idx_rules_model ON rules(model_username, is_active);
`;

export const README_MD = `# GlowBot - Chaturbate Model Assistant (Chrome Extension MV3)

> **Extensie Google Chrome (Manifest V3)** de nivel enterprise concepută pentru transmisiuni live pe Chaturbate. Asigură monitorizarea donațiilor în timp real, evidențierea donatorilor VIP, automatizări de chat și subiect de cameră, cu buffer offline resilient și sincronizare sigură prin backend dedicat Node.js / Express.

---

## ⚡ Caracteristici Principale

- **DOM Resilience & Multi-Selector Fallback:** Observator \`MutationObserver\` optimizat pentru structura dinamică a camerei Chaturbate (\`#chat_text_list\`, \`.chat-list\`, \`[data-testid="chat-container"]\`).
- **Resource Guard & Memory Leak Protection:** Rulează exclusiv pe paginile de broadcaster (\`/b/\`). Istoricul evenimentelor din memorie este plafonat strict la 1000 de intrări, iar observatorii sunt decuplați la navigare/unload.
- **VIP Chat Highlight:** Evidențiere dinamică a mesajului în chat la primirea unui bacșiș de peste pragul configurat (chenar auriu și glow timp de 5 secunde).
- **Auto-Goal Subject Update:** Când suma token-urilor din sesiune atinge pragul configurat, extensia actualizează automat titlul camerei (\`room_subject\`) și salvează modificarea în interfața Chaturbate.
- **Auto-Thank & Auto-Welcome:** Mesaje automate configurabile cu șabloane dinamice (\`{user}\`, \`{tokens}\`, \`{nextGoal}\`).
- **Sound Alerts (Alerte Sonore Audio Locale):** Redare audio instantanee în browser la recepționarea de tips peste pragul minim (ex: 25tk) și sunet exclusiv pentru donatori VIP (100+ tk), cu volum reglabil și suport pentru URL-uri audio externe MP3/WAV/OGG.
- **On-Screen HUD & Notificări Desktop:** Widget discret suprapus cu metrici de sesiune (token-uri și tip-uri) plus notificări native Chrome la depășirea pragului setat.
- **Offline Buffer & Exponential Backoff:** Coadă persistentă în \`chrome.storage.local\` (max. 500 elemente). În caz de rețea instabilă, reîncercările folosesc backoff exponențial cu jitter (1.5s - 60s) și trezire prin \`chrome.alarms\`.
- **UI Modern Vercel-Style (Dark Mode):** Panou popup stilizat cu Tailwind / Vercel dark mode, indicator de stare cu tooltip dinamic (\`Ultima sincronizare: acum X minute\`), validare pe formulare și testare non-blocantă a conexiunii.

---

## 📦 Structura Fișierelor

\`\`\`
glowbot-extension/
├── manifest.json       # Configurația Manifest V3 (permisiuni minimale: storage, notifications, alarms)
├── background.js       # Service Worker pentru coadă offline, retry și sincronizare backend
├── content.js          # Observator DOM, VIP highlight, auto-goal și HUD pe ecran
├── popup.html          # Interfață modernă de control Dark Mode
├── popup.js            # Controller pentru popup, validări și comunicare IPC
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
\`\`\`

---

## 🛠️ Ghid de Instalare în Google Chrome (Load Unpacked)

1. **Pregătirea fișierelor:**
   - Descarcă arhiva extensiei sau clonează repository-ul.
   - Dezarhivează conținutul într-un director dedicat (de exemplu \`C:\\glowbot-extension\` sau \`~/glowbot-extension\`).
   - Asigură-te că fișierul \`manifest.json\` se află direct la rădăcina folderului selectat.

2. **Activarea Modului Dezvoltator:**
   - Deschide Google Chrome și tastează în bara de adrese:
     \`\`\`text
     chrome://extensions/
     \`\`\`
   - În colțul din dreapta-sus, comută comutatorul **"Developer mode"** (Modul pentru dezvoltatori) pe poziția activat.

3. **Încărcarea Extensiei:**
   - Dă click pe butonul **"Load unpacked"** (Încarcă extensia despachetată) din stânga-sus.
   - Navighează și selectează folderul dezarhivat.
   - Extensia **GlowBot - Chaturbate Model Assistant** va apărea în lista extensiilor active.
   - Se recomandă fixarea iconiței în bara de unelte Chrome (click pe iconița puzzle 🧩 -> Pin).

---

## ⚙️ Configurare Token și Conexiune Backend

Pentru a sincroniza datele cu serverul tău dedicat:

1. **Generarea Bot Token-ului:**
   - Pe serverul tău Node.js/Express, rulează comanda CLI de generare token sau inserează o înregistrare în tabela \`models\` din SQLite:
     \`\`\`bash
     npm run generate-token -- --model="nume_model"
     # Exemplu de token generat: glw_sec_89dfa47b19283f
     \`\`\`
   - Alternativ, poți folosi token-ul configurat în variabila ta de mediu \`BOT_ACCESS_TOKEN\`.

2. **Setarea în Extensie:**
   - Deschide fereastra popup a extensiei dând click pe iconița GlowBot.
   - Completează câmpurile obligatorii:
     - **Bot Token Secret (\*):** Cheia ta privată generată anterior.
     - **Endpoint Backend:** URL-ul API-ului tău (ex: \`https://glowbby.online/v1/bot/event\` sau \`http://localhost:3000/v1/bot/event\` pentru testare locală).
   - Apasă butonul **"⚡ Testează Conexiunea"**:
     - Sistemul va trimite un ping de autentificare fără a bloca interfața.
     - Va apărea un indicator de succes verde (\`✓ Conexiune reușită!\`) sau o alertă inline cu eroarea raportată de server.
   - Apasă **"Salvează Toate Setările"**. Butonul este activ doar atunci când token-ul este completat.

3. **Personalizarea Pragului de Goal și VIP:**
   - **Prag Minim VIP:** Setează numărul de token-uri (ex: 100 tk) de la care un spectator este considerat VIP și evidențiat cu auriu în chat.
   - **Auto-Goal Subject Update:** Bifează opțiunea și setează pragul dorit (ex: 500 tk) împreună cu șablonul de titlu (ex: \`🎯 GOAL REACHED! Următorul goal: {nextGoal}tk | Mulțumiri!\`).

---

## 🔒 Politica de Securitate și Permisiuni (Chrome Web Store Standard)

Extensia respectă cu strictețe principiul permisiunilor minime necesare (*Least Privilege Principle*):

| Permisiune | Justificare Tehnică |
| :--- | :--- |
| \`storage\` | Salvarea setărilor utilizatorului și persistența cozii de evenimente (\`glowbot_event_queue\`) în caz de offline. |
| \`notifications\` | Declanșarea alertelor desktop native Chrome atunci când se recepționează bacșișuri mari sau donații VIP. |
| \`alarms\` | Trezirea fiabilă a Service Worker-ului Manifest V3 pentru reluarea sincronizării cu Exponential Backoff. |
| \`host_permissions\` (\`*.chaturbate.com\`) | Injectarea content script-ului pe camerele live pentru monitorizarea chat-ului. |
| \`host_permissions\` (Backend API) | Autorizarea apelurilor \`fetch()\` efectuate de Service Worker către endpoint-ul tău securizat. |

*Notă de securitate:* Permisiunile invazive (\`tabs\`, \`cookies\`, \`webRequest\`, \`activeTab\`, \`scripting\`, \`<all_urls>\`) au fost complet eliminate.
`;

