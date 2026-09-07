import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Sparkles, 
  Crown, 
  Check, 
  Sliders, 
  ExternalLink, 
  Music, 
  AlertCircle,
  Save,
  RotateCcw
} from 'lucide-react';

const PRESET_SOUNDS = [
  {
    name: 'Ding Monede (Clasic)',
    url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    type: 'standard'
  },
  {
    name: 'Chime Magic Suav',
    url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    type: 'standard'
  },
  {
    name: 'Slot Machine Jackpot',
    url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    type: 'vip'
  },
  {
    name: 'Fanfare VIP Triumfătoare',
    url: 'https://assets.mixkit.co/active_storage/sfx/1433/1433-preview.mp3',
    type: 'vip'
  },
  {
    name: 'Glow Synth Arpeggio',
    url: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
    type: 'standard'
  }
];

export const SoundAlertsConfig: React.FC = () => {
  const [enableSoundAlerts, setEnableSoundAlerts] = useState<boolean>(() => {
    const saved = localStorage.getItem('glowbot_enable_sound_alerts');
    return saved !== null ? saved === 'true' : true;
  });

  const [soundAlertThreshold, setSoundAlertThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('glowbot_sound_alert_threshold');
    return saved ? parseInt(saved, 10) : 25;
  });

  const [soundAlertAudioUrl, setSoundAlertAudioUrl] = useState<string>(() => {
    const saved = localStorage.getItem('glowbot_sound_alert_url');
    return saved || 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
  });

  const [soundAlertVolume, setSoundAlertVolume] = useState<number>(() => {
    const saved = localStorage.getItem('glowbot_sound_alert_volume');
    return saved ? parseFloat(saved) : 0.8;
  });

  const [enableVipCustomSound, setEnableVipCustomSound] = useState<boolean>(() => {
    const saved = localStorage.getItem('glowbot_enable_vip_custom_sound');
    return saved !== null ? saved === 'true' : true;
  });

  const [vipSoundAlertAudioUrl, setVipSoundAlertAudioUrl] = useState<string>(() => {
    const saved = localStorage.getItem('glowbot_vip_sound_url');
    return saved || 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3';
  });

  // Audio testing preview state
  const [isPlayingStandard, setIsPlayingStandard] = useState(false);
  const [isPlayingVip, setIsPlayingVip] = useState(false);
  const [testTipTokens, setTestTipTokens] = useState(100);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testAudioStatus, setTestAudioStatus] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlaySound = (url: string, isVipTest = false) => {
    if (!url) {
      setTestAudioStatus('Eroare: URL-ul audio este gol!');
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setTestAudioStatus(null);
      if (isVipTest) setIsPlayingVip(true);
      else setIsPlayingStandard(true);

      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, soundAlertVolume));
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingStandard(false);
        setIsPlayingVip(false);
        setTestAudioStatus('Sunet redat cu succes!');
      };

      audio.onerror = () => {
        setIsPlayingStandard(false);
        setIsPlayingVip(false);
        setTestAudioStatus('Eroare la redarea fișierului audio. Verifică URL-ul sau CORS.');
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          setIsPlayingStandard(false);
          setIsPlayingVip(false);
          setTestAudioStatus(`Redare blocată de browser sau link invalid: ${err.message}`);
        });
      }
    } catch (err: any) {
      setIsPlayingStandard(false);
      setIsPlayingVip(false);
      setTestAudioStatus(`Excepție audio: ${err.message}`);
    }
  };

  const handleStopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlayingStandard(false);
    setIsPlayingVip(false);
    setTestAudioStatus(null);
  };

  const handleSaveToExtensionStorage = () => {
    localStorage.setItem('glowbot_enable_sound_alerts', String(enableSoundAlerts));
    localStorage.setItem('glowbot_sound_alert_threshold', String(soundAlertThreshold));
    localStorage.setItem('glowbot_sound_alert_url', soundAlertAudioUrl.trim());
    localStorage.setItem('glowbot_sound_alert_volume', String(soundAlertVolume));
    localStorage.setItem('glowbot_enable_vip_custom_sound', String(enableVipCustomSound));
    localStorage.setItem('glowbot_vip_sound_url', vipSoundAlertAudioUrl.trim());

    // Dacă rulăm în context de extensie Chrome, persistăm și în chrome.storage.local
    if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
      (window as any).chrome.storage.local.get('glowbot_settings', (data: any) => {
        const current = data?.glowbot_settings || {};
        const updated = {
          ...current,
          enableSoundAlerts,
          soundAlertThreshold,
          soundAlertAudioUrl: soundAlertAudioUrl.trim(),
          soundAlertVolume,
          enableVipCustomSound,
          vipSoundAlertAudioUrl: vipSoundAlertAudioUrl.trim()
        };
        (window as any).chrome.storage.local.set({ glowbot_settings: updated });
      });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    if (confirm('Resetezi toate setările de sunet la valorile implicite?')) {
      setEnableSoundAlerts(true);
      setSoundAlertThreshold(25);
      setSoundAlertAudioUrl('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
      setSoundAlertVolume(0.8);
      setEnableVipCustomSound(true);
      setVipSoundAlertAudioUrl('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    }
  };

  // Simulare declanșare sunet pe bază de tokens
  const handleSimulateTipSound = () => {
    if (!enableSoundAlerts) {
      setTestAudioStatus('Alertele sonore sunt dezactivate!');
      return;
    }

    if (testTipTokens < soundAlertThreshold) {
      setTestAudioStatus(`Tip-ul (${testTipTokens} tk) este sub pragul minim configurat (${soundAlertThreshold} tk). Sunetul nu se declanșează.`);
      return;
    }

    const isVip = testTipTokens >= 100;
    if (isVip && enableVipCustomSound && vipSoundAlertAudioUrl) {
      setTestAudioStatus(`🌟 Sunet VIP declanșat pentru ${testTipTokens} token-uri!`);
      handlePlaySound(vipSoundAlertAudioUrl, true);
    } else {
      setTestAudioStatus(`🔔 Sunet Standard declanșat pentru ${testTipTokens} token-uri!`);
      handlePlaySound(soundAlertAudioUrl, false);
    }
  };

  return (
    <div id="sound-alerts-config-container" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/30 to-pink-600/30 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Sound Alerts (Alerte Sonore Live)</h3>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                Client-Side Audio API
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Redă automat semnale audio locale în browser-ul modelului la recepționarea unui tip peste pragul configurat, fără dependențe externe sau software OBS greoi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSaveToExtensionStorage}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-md shadow-pink-600/20 cursor-pointer"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'Salvat în Extensie!' : 'Salvează Setările'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-7 space-y-4">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Activează Alertele Sonore în Camera Live</span>
                {enableSoundAlerts && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    ACTIV
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Extensia va inițializa instanța <code className="text-slate-300 font-mono">Audio()</code> în contextul paginii Chaturbate.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableSoundAlerts}
                onChange={(e) => setEnableSoundAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          {/* Threshold & Volume Slider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Prag Minim Sunet (Tokens)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50000"
                  value={soundAlertThreshold}
                  onChange={(e) => setSoundAlertThreshold(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-pink-500"
                />
                <span className="text-xs text-amber-400 font-bold font-mono">tk</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Tips sub această valoare nu emit sunet.
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-200">Volum Audio</label>
                <span className="text-xs font-mono text-pink-400 font-bold">{Math.round(soundAlertVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundAlertVolume}
                onChange={(e) => setSoundAlertVolume(parseFloat(e.target.value))}
                className="w-full accent-pink-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Nivelul audio aplicat elementului redat.
              </span>
            </div>
          </div>

          {/* Standard Sound URL */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-pink-400" />
                URL Fișier Audio Standard (MP3 / WAV / OGG)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isPlayingStandard) handleStopSound();
                  else handlePlaySound(soundAlertAudioUrl, false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  isPlayingStandard 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isPlayingStandard ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
                <span>{isPlayingStandard ? 'Oprește' : 'Ascultă'}</span>
              </button>
            </div>
            <input
              type="text"
              value={soundAlertAudioUrl}
              onChange={(e) => setSoundAlertAudioUrl(e.target.value)}
              placeholder="https://domeniu.com/sunet-tip.mp3"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* VIP Custom Sound Toggle & URL */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Sunet Diferit pentru Tips VIP (100+ tk)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableVipCustomSound}
                  onChange={(e) => setEnableVipCustomSound(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {enableVipCustomSound && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-300">URL Audio VIP Exclusiv</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (isPlayingVip) handleStopSound();
                      else handlePlaySound(vipSoundAlertAudioUrl, true);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      isPlayingVip 
                        ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isPlayingVip ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3 text-amber-400" />}
                    <span>{isPlayingVip ? 'Oprește' : 'Ascultă VIP'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={vipSoundAlertAudioUrl}
                  onChange={(e) => setVipSoundAlertAudioUrl(e.target.value)}
                  placeholder="https://domeniu.com/sunet-vip.mp3"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Presets Library & Live Simulator */}
        <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
          {/* Preset Sound selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Sunete Presetate Gata de Utilizat
            </span>
            <p className="text-[11px] text-slate-400">
              Apasă pentru a asculta și a încărca rapid link-ul audio în câmpurile configurate:
            </p>

            <div className="space-y-1.5">
              {PRESET_SOUNDS.map((preset, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {preset.type === 'vip' ? (
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Music className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    )}
                    <span className="text-slate-200 truncate">{preset.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlaySound(preset.url, preset.type === 'vip')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Ascultă sunetul"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (preset.type === 'vip') {
                          setVipSoundAlertAudioUrl(preset.url);
                          setEnableVipCustomSound(true);
                        } else {
                          setSoundAlertAudioUrl(preset.url);
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 text-[10px] font-semibold cursor-pointer"
                    >
                      Folosește
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simulator Box */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-pink-400" />
              Simulator Rapid de Declanșare Alertă
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 mb-0.5">Valoare Tip Testat</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={testTipTokens}
                    onChange={(e) => setTestTipTokens(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                  <span className="text-xs text-slate-400 font-mono">tk</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSimulateTipSound}
                className="mt-3 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                <span>Simulează</span>
              </button>
            </div>

            {testAudioStatus && (
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-sans flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{testAudioStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
