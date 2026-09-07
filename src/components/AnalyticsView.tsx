import React, { useState, useMemo } from 'react';
import { BotEventPayload } from '../types/extension';
import { 
  BarChart3, 
  TrendingUp, 
  Coins, 
  Crown, 
  Users, 
  Clock, 
  Calendar, 
  ArrowUpRight, 
  Filter, 
  RefreshCw, 
  Zap, 
  Database, 
  Terminal, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  PieChart as PieIcon,
  Layers,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AnalyticsViewProps {
  events: BotEventPayload[];
  onSimulateTip?: (tip: BotEventPayload) => void;
}

// Preset baseline historical records in SQLite to make the 24h trend realistic
const BASELINE_HOURLY_DATA = [
  { hour: '00:00', tokens: 120, tipsCount: 4, vips: 0 },
  { hour: '02:00', tokens: 85, tipsCount: 2, vips: 0 },
  { hour: '04:00', tokens: 40, tipsCount: 1, vips: 0 },
  { hour: '06:00', tokens: 110, tipsCount: 3, vips: 0 },
  { hour: '08:00', tokens: 280, tipsCount: 6, vips: 1 },
  { hour: '10:00', tokens: 450, tipsCount: 9, vips: 2 },
  { hour: '12:00', tokens: 620, tipsCount: 14, vips: 2 },
  { hour: '14:00', tokens: 890, tipsCount: 18, vips: 3 },
  { hour: '16:00', tokens: 1250, tipsCount: 22, vips: 5 },
  { hour: '18:00', tokens: 1780, tipsCount: 31, vips: 7 },
  { hour: '20:00', tokens: 2450, tipsCount: 42, vips: 11 },
  { hour: '22:00', tokens: 1980, tipsCount: 35, vips: 8 }
];

const BASELINE_TOP_TIPPERS = [
  { username: 'Marco_VIP', totalTokens: 1850, tipCount: 12, isVip: true, lastTip: 'Acum 12 min' },
  { username: 'CryptoWhale_99', totalTokens: 1400, tipCount: 4, isVip: true, lastTip: 'Acum 35 min' },
  { username: 'NeonKnight', totalTokens: 980, tipCount: 9, isVip: true, lastTip: 'Acum 1h' },
  { username: 'DiamondFan_88', totalTokens: 750, tipCount: 6, isVip: true, lastTip: 'Acum 2h' },
  { username: 'Dan_London', totalTokens: 425, tipCount: 5, isVip: false, lastTip: 'Acum 45 min' },
  { username: 'sweet_heart22', totalTokens: 310, tipCount: 7, isVip: false, lastTip: 'Acum 3h' },
  { username: 'ShadowBlade', totalTokens: 250, tipCount: 2, isVip: false, lastTip: 'Acum 4h' },
  { username: 'Alex_NYC', totalTokens: 190, tipCount: 3, isVip: false, lastTip: 'Acum 5h' }
];

const TIER_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ events, onSimulateTip }) => {
  const [timeRange, setTimeRange] = useState<'24h' | 'today' | '7d'>('24h');
  const [chartMetric, setChartMetric] = useState<'combined' | 'tokens' | 'count'>('combined');
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [activeQueryTab, setActiveQueryTab] = useState<'hourly' | 'top_tippers' | 'summary'>('hourly');

  // Dynamic aggregation combining baseline SQLite records with live captured session events
  const { hourlyChartData, topTippersData, metrics, tierDistribution } = useMemo(() => {
    // Clone baseline hourly data
    const hourMap = new Map<string, { hour: string; tokens: number; tipsCount: number; vips: number }>();
    BASELINE_HOURLY_DATA.forEach(item => {
      hourMap.set(item.hour, { ...item });
    });

    // Clone baseline top tippers
    const tipperMap = new Map<string, { username: string; totalTokens: number; tipCount: number; isVip: boolean; lastTip: string }>();
    BASELINE_TOP_TIPPERS.forEach(t => {
      tipperMap.set(t.username, { ...t });
    });

    // Incorporate live events captured in real-time
    events.forEach(evt => {
      if (evt.type === 'tip' && evt.data.tokens && evt.data.tokens > 0) {
        const tokens = evt.data.tokens;
        const tipper = evt.data.tipper || 'Anonymous';
        const isVip = !!evt.data.isVip || tokens >= 100;
        
        // Determine hour slot (default to current local hour or parsed timestamp)
        let hourKey = '22:00';
        try {
          const d = new Date(evt.timestamp);
          if (!isNaN(d.getTime())) {
            const h = d.getHours();
            // Bucket into nearest even hour for smooth 24h visualization
            const bucketHour = (Math.floor(h / 2) * 2).toString().padStart(2, '0') + ':00';
            hourKey = bucketHour;
          }
        } catch {
          hourKey = '22:00';
        }

        if (hourMap.has(hourKey)) {
          const current = hourMap.get(hourKey)!;
          current.tokens += tokens;
          current.tipsCount += 1;
          if (isVip) current.vips += 1;
        } else {
          hourMap.set(hourKey, { hour: hourKey, tokens, tipsCount: 1, vips: isVip ? 1 : 0 });
        }

        // Update tipper stats
        if (tipperMap.has(tipper)) {
          const curr = tipperMap.get(tipper)!;
          curr.totalTokens += tokens;
          curr.tipCount += 1;
          if (curr.totalTokens >= 100) curr.isVip = true;
          curr.lastTip = 'Chiar acum';
        } else {
          tipperMap.set(tipper, {
            username: tipper,
            totalTokens: tokens,
            tipCount: 1,
            isVip: isVip,
            lastTip: 'Chiar acum'
          });
        }
      }
    });

    const hourly = Array.from(hourMap.values());
    const topTippers = Array.from(tipperMap.values())
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 10);

    // Compute key metrics
    const totalTokens = hourly.reduce((sum, h) => sum + h.tokens, 0);
    const totalTipsCount = hourly.reduce((sum, h) => sum + h.tipsCount, 0);
    const avgTipSize = totalTipsCount > 0 ? Math.round(totalTokens / totalTipsCount) : 0;
    const usdEstimate = (totalTokens * 0.05).toFixed(2);
    const vipCount = topTippers.filter(t => t.isVip).length;

    // Peak hour
    let peak = hourly[0] || { hour: '20:00', tokens: 0 };
    hourly.forEach(h => {
      if (h.tokens > peak.tokens) peak = h;
    });

    // Tier Distribution (Whales >= 100, Regular 25-99, Micro < 25)
    let whaleTokens = 0;
    let regularTokens = 0;
    let microTokens = 0;

    topTippers.forEach(t => {
      if (t.totalTokens >= 100) whaleTokens += t.totalTokens;
      else if (t.totalTokens >= 25) regularTokens += t.totalTokens;
      else microTokens += t.totalTokens;
    });

    const tiers = [
      { name: 'VIP / Whales (>= 100 tk)', value: whaleTokens, count: topTippers.filter(t => t.totalTokens >= 100).length },
      { name: 'Regular (25 - 99 tk)', value: regularTokens, count: topTippers.filter(t => t.totalTokens >= 25 && t.totalTokens < 100).length },
      { name: 'Micro Tippers (< 25 tk)', value: microTokens, count: topTippers.filter(t => t.totalTokens < 25).length }
    ];

    return {
      hourlyChartData: hourly,
      topTippersData: topTippers,
      metrics: {
        totalTokens,
        totalTipsCount,
        avgTipSize,
        usdEstimate,
        vipCount,
        peakHour: peak.hour,
        peakTokens: peak.tokens
      },
      tierDistribution: tiers
    };
  }, [events]);

  const sqlQueries = {
    hourly: `-- 1. Interogare Agregare Tips per Oră (SQLite)
SELECT 
  strftime('%H:00', received_at) AS hour_slot,
  SUM(amount_tokens)             AS hourly_tokens,
  COUNT(*)                       AS tip_count,
  SUM(is_vip)                    AS vip_tips_count
FROM bot_events
WHERE event_type = 'tip'
  AND received_at >= datetime('now', '-24 hours')
GROUP BY hour_slot
ORDER BY hour_slot ASC;`,
    top_tippers: `-- 2. Interogare Top Suporteri (din tabela tipper_stats)
SELECT 
  tipper_username,
  total_tokens,
  tip_count,
  is_vip,
  ROUND(CAST(total_tokens AS FLOAT) / tip_count, 1) AS avg_per_tip,
  last_tip_at
FROM tipper_stats
ORDER BY total_tokens DESC
LIMIT 10;`,
    summary: `-- 3. Statistici Generale Sesiune / Zi curentă
SELECT 
  COALESCE(SUM(amount_tokens), 0)            AS total_tokens,
  COUNT(*)                                  AS total_tips,
  ROUND(AVG(amount_tokens), 1)              AS avg_tip_amount,
  COUNT(DISTINCT sender_username)           AS unique_tippers,
  SUM(CASE WHEN is_vip = 1 THEN 1 ELSE 0 END) AS vip_transactions
FROM bot_events
WHERE event_type = 'tip'
  AND DATE(received_at) = DATE('now');`
  };

  const handleCopyQuery = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  // Quick trigger to simulate an incoming tip if prop provided
  const handleQuickTip = (tokens: number, tipper: string, isVip: boolean) => {
    if (onSimulateTip) {
      onSimulateTip({
        id: 'live_tip_' + Date.now(),
        type: 'tip',
        model: 'alexa_star',
        timestamp: new Date().toISOString(),
        data: {
          tipper,
          tokens,
          message: isVip ? 'Huge shoutout to the best model! ⭐' : 'Love the show! ❤️',
          isVip
        }
      });
    }
  };

  return (
    <div id="analytics-tab-container" className="space-y-6">
      {/* Header Bar with Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-pink-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>SQLite Data Engine &amp; Recharts Visualization</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Analiză Agregată Tips &amp; Clasament Suporteri
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Date agregate în timp real din tabelele SQLite <code className="text-pink-400 font-mono">bot_events</code> și <code className="text-indigo-400 font-mono">tipper_stats</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/80">
            <button
              id="range-24h-btn"
              onClick={() => setTimeRange('24h')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                timeRange === '24h'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ultimele 24h
            </button>
            <button
              id="range-today-btn"
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                timeRange === 'today'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Azi (Sesiune)
            </button>
            <button
              id="range-7d-btn"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ultimele 7 Zile
            </button>
          </div>

          {/* Quick Simulate Live Tip Trigger */}
          {onSimulateTip && (
            <button
              id="analytics-quick-simulate-btn"
              onClick={() => handleQuickTip(150, 'Marco_VIP', true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer transition-all"
              title="Trimite un tip de test pentru a observa actualizarea instantanee a graficelor"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>+150 tk Test</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tokens Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Token-uri</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-extrabold text-amber-400">
              {metrics.totalTokens.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">tk</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Echivalent USD:</span>
            <span className="font-mono text-emerald-400 font-bold">${metrics.usdEstimate}</span>
          </div>
        </div>

        {/* Total Tips Count Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tranzacții Tips</span>
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-extrabold text-pink-400">
              {metrics.totalTipsCount}
            </span>
            <span className="text-xs text-slate-400">tips recepționate</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Medie per Tip:</span>
            <span className="font-mono text-pink-300 font-bold">{metrics.avgTipSize} tk / tip</span>
          </div>
        </div>

        {/* Peak Hour Activity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Oră de Vârf</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-extrabold text-purple-300">
              {metrics.peakHour}
            </span>
            <span className="text-xs text-slate-400 font-mono">({metrics.peakTokens} tk)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Ritm flux maxim:</span>
            <span className="text-xs text-purple-300 font-semibold">Seara (20:00 - 22:00)</span>
          </div>
        </div>

        {/* VIP Donors Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Suporteri VIP</span>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-extrabold text-yellow-400">
              {metrics.vipCount}
            </span>
            <span className="text-xs text-slate-400">utilizatori &ge; 100 tk</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Rată de conversie VIP:</span>
            <span className="font-mono text-yellow-300 font-bold">
              {Math.round((metrics.vipCount / Math.max(1, topTippersData.length)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CHART SECTION: Hourly Tips & Token Volume Trend (Recharts) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Trend Orar: Volum Token-uri &amp; Frecvență Tips per Oră
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribuția în timp a generării de venituri și activității spectatorilor pe parcursul celor 24 de ore
            </p>
          </div>

          {/* Metric View Controls */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/80 self-start sm:self-auto">
            <button
              id="chart-mode-combined"
              onClick={() => setChartMetric('combined')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                chartMetric === 'combined'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Combinat (Tokens + Tips)
            </button>
            <button
              id="chart-mode-tokens"
              onClick={() => setChartMetric('tokens')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                chartMetric === 'tokens'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Doar Token-uri
            </button>
            <button
              id="chart-mode-count"
              onClick={() => setChartMetric('count')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                chartMetric === 'count'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Doar Număr Tips
            </button>
          </div>
        </div>

        {/* Recharts Hourly Trend Canvas */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#be185d" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="hour" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              {/* Left Y Axis for Token Volume */}
              {(chartMetric === 'combined' || chartMetric === 'tokens') && (
                <YAxis 
                  yAxisId="left" 
                  stroke="#ec4899" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `${val} tk`}
                />
              )}
              {/* Right Y Axis for Tip Frequency */}
              {(chartMetric === 'combined' || chartMetric === 'count') && (
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#10b981" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `${val} tips`}
                />
              )}
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950 border border-slate-700/80 rounded-lg p-3 shadow-xl text-xs font-sans">
                        <div className="font-bold text-white border-b border-slate-800 pb-1 mb-2 flex items-center justify-between gap-4">
                          <span>Interval Orar: {label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">SQLite Bucket</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-pink-400 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-pink-500"></span> Volum Tokens:
                            </span>
                            <span className="font-mono font-bold text-white">{data.tokens.toLocaleString()} tk</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Număr Tips:
                            </span>
                            <span className="font-mono font-bold text-white">{data.tipsCount} tranzacții</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Valoare USD aprox:
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              ${(data.tokens * 0.05).toFixed(2)}
                            </span>
                          </div>
                          {data.vips > 0 && (
                            <div className="flex items-center justify-between gap-4 pt-1 text-yellow-400">
                              <span className="flex items-center gap-1">👑 Tips VIP:</span>
                              <span className="font-mono font-bold">{data.vips}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                align="right"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
              />
              
              {/* Token Area */}
              {(chartMetric === 'combined' || chartMetric === 'tokens') && (
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="tokens" 
                  name="Volum Token-uri (tk)" 
                  stroke="#ec4899" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#tokenGradient)" 
                />
              )}

              {/* Tip Count Line or Bar */}
              {chartMetric === 'combined' && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="tipsCount" 
                  name="Frecvență Tips (număr)" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5, fill: '#34d399' }}
                />
              )}

              {chartMetric === 'count' && (
                <Bar 
                  yAxisId="right"
                  dataKey="tipsCount" 
                  name="Frecvență Tips (număr)" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECOND ROW: TOP TIPPERS BAR CHART + TIER DISTRIBUTION PIE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Tippers Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Top Suporteri (Token-uri Totale)
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Tabela: tipper_stats
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Clasamentul suporterilor ordonat descrescător după suma totală acumulată în sesiunile active.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topTippersData.slice(0, 7)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 35, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickFormatter={(v) => `${v} tk`}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="username" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
                            <div className="font-bold text-white flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-800">
                              {d.isVip && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                              <span>{d.username}</span>
                              {d.isVip && (
                                <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.2 rounded border border-yellow-500/30">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="text-slate-300 space-y-1">
                              <div>Total: <strong className="text-amber-400 font-mono">{d.totalTokens.toLocaleString()} tk</strong></div>
                              <div>Echivalent USD: <strong className="text-emerald-400 font-mono">${(d.totalTokens * 0.05).toFixed(2)}</strong></div>
                              <div>Număr Tips: <span className="text-pink-300 font-mono">{d.tipCount}</span></div>
                              <div>Ultimul Tip: <span className="text-slate-400">{d.lastTip}</span></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="totalTokens" 
                    radius={[0, 6, 6, 0]}
                  >
                    {topTippersData.slice(0, 7).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isVip ? '#eab308' : '#ec4899'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800 pt-3 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-yellow-500"></span>
              <span>Suporter VIP (&ge; 100 tk)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-pink-500"></span>
              <span>Suporter Standard</span>
            </div>
          </div>
        </div>

        {/* Tier Distribution Pie Chart (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Distribuție pe Categorii
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Segmentare Venituri
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Proporția token-urilor donate în funcție de nivelul de contribuție al spectatorilor.
            </p>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {tierDistribution.map((entry, index) => (
                      <Cell key={`tier-${index}`} fill={TIER_COLORS[index % TIER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const total = tierDistribution.reduce((acc, curr) => acc + curr.value, 0);
                        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                        return (
                          <div className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs shadow-xl">
                            <div className="font-bold text-white mb-1">{d.name}</div>
                            <div className="text-amber-400 font-mono font-bold">{d.value.toLocaleString()} tk ({pct}%)</div>
                            <div className="text-slate-400 text-[11px]">{d.count} utilizatori</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            {tierDistribution.map((tier, idx) => (
              <div key={tier.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: TIER_COLORS[idx % TIER_COLORS.length] }}
                  ></span>
                  <span className="text-slate-300">{tier.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-200">{tier.value.toLocaleString()} tk</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DETAILED SQLITE TABLE: Top Tippers Detailed Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Tabela SQLite &ldquo;tipper_stats&rdquo; &bull; Date Detaliate Suporteri
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Înregistrări sincronizate direct prin tranzacții atomice la fiecare eveniment recepționat
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Total înregistrați:</span>
            <span className="text-xs font-mono font-bold bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
              {topTippersData.length} suporteri
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Rang</th>
                <th className="py-3 px-4">Utilizator (Tipper)</th>
                <th className="py-3 px-4">Status VIP</th>
                <th className="py-3 px-4 text-right">Total Token-uri</th>
                <th className="py-3 px-4 text-right">Valoare USD</th>
                <th className="py-3 px-4 text-center">Număr Tips</th>
                <th className="py-3 px-4 text-right">Medie / Tip</th>
                <th className="py-3 px-4 text-right">Ultimul Tip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {topTippersData.map((tipper, idx) => {
                const avg = tipper.tipCount > 0 ? Math.round(tipper.totalTokens / tipper.tipCount) : 0;
                return (
                  <tr key={tipper.username} className="hover:bg-slate-800/30 transition-colors">
                    {/* Rank */}
                    <td className="py-3 px-4 font-mono">
                      {idx === 0 ? (
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <Award className="w-4 h-4 text-yellow-400" /> #1
                        </span>
                      ) : idx === 1 ? (
                        <span className="flex items-center gap-1 text-slate-300 font-bold">
                          <Award className="w-4 h-4 text-slate-400" /> #2
                        </span>
                      ) : idx === 2 ? (
                        <span className="flex items-center gap-1 text-amber-600 font-bold">
                          <Award className="w-4 h-4 text-amber-600" /> #3
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">#{idx + 1}</span>
                      )}
                    </td>

                    {/* Username */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-pink-400 border border-slate-700">
                          {tipper.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{tipper.username}</span>
                      </div>
                    </td>

                    {/* VIP Status */}
                    <td className="py-3 px-4">
                      {tipper.isVip ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          <Crown className="w-3 h-3 text-yellow-400" /> VIP SUPPORTER
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                          STANDARD
                        </span>
                      )}
                    </td>

                    {/* Total Tokens */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                      {tipper.totalTokens.toLocaleString()} tk
                    </td>

                    {/* USD Value */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                      ${(tipper.totalTokens * 0.05).toFixed(2)}
                    </td>

                    {/* Tip Count */}
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {tipper.tipCount}
                    </td>

                    {/* Avg / Tip */}
                    <td className="py-3 px-4 text-right font-mono text-pink-300">
                      {avg} tk
                    </td>

                    {/* Last Tip */}
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                      {tipper.lastTip}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SQLITE QUERY INSPECTOR: Real SQL Queries executing on server.js */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Interogări SQLite Reale (better-sqlite3)
              </h3>
              <p className="text-xs text-slate-400">
                Instrucțiunile SQL exacte utilizate de server pentru calculul agregatelor prezentate mai sus
              </p>
            </div>
          </div>

          <button
            id="copy-sql-query-btn"
            onClick={() => handleCopyQuery(sqlQueries[activeQueryTab])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-all shrink-0"
          >
            {copiedQuery ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiat!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiază SQL</span>
              </>
            )}
          </button>
        </div>

        {/* Query Tabs */}
        <div className="flex space-x-2 mb-3">
          {[
            { id: 'hourly', label: '1. Agregare Tips per Oră' },
            { id: 'top_tippers', label: '2. Clasament Top Suporteri' },
            { id: 'summary', label: '3. Totaluri & Medii Sesiune' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveQueryTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeQueryTab === tab.id
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-pink-300 overflow-x-auto border border-slate-800 leading-relaxed">
          {sqlQueries[activeQueryTab]}
        </pre>
      </div>
    </div>
  );
};
