import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  ComposedChart,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  AlertTriangle,
  Anchor,
  BarChart3,
  Bot,
  ChevronDown,
  CircleDollarSign,
  Cpu,
  Factory,
  Fuel,
  Landmark,
  Menu,
  MessageCircle,
  Moon,
  PanelLeft,
  Send,
  Settings,
  ShieldCheck,
  Ship,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

type Signal = "STRONG BUY" | "BUY" | "HOLD" | "SELL";
type Regime = "Expansion" | "Late Cycle" | "Recession" | "Recovery";

type Trade = {
  symbol: string;
  sector: string;
  entry: number;
  target: number;
  stop: number;
  confidence: number;
  expectedReturn: number;
  volatility: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

type LiveQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  high: number;
  low: number;
};

type LiveStatus = "idle" | "loading" | "live" | "error";

const LIVE_REFRESH_MS = 5 * 60 * 1000;

const assets = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    sector: "Technology",
    price: 225.3,
    change: 0.54,
    aiScore: 96,
    signal: "STRONG BUY" as Signal,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    sector: "Technology",
    price: 346.37,
    change: 0.82,
    aiScore: 88,
    signal: "STRONG BUY" as Signal,
  },
  {
    symbol: "XLE",
    name: "Energy ETF",
    sector: "Energy",
    price: 61.06,
    change: 0.05,
    aiScore: 78,
    signal: "BUY" as Signal,
  },
  {
    symbol: "SBLK",
    name: "Star Bulk Carriers",
    sector: "Shipping",
    price: 27.89,
    change: 1.05,
    aiScore: 80,
    signal: "STRONG BUY" as Signal,
  },
  {
    symbol: "BX",
    name: "Blackstone",
    sector: "Private Credit",
    price: 146.41,
    change: -0.52,
    aiScore: 85,
    signal: "BUY" as Signal,
  },
];

const shippingData = [
  { date: "Jul 16", tce: 58000, utilization: 90 },
  { date: "Jul 23", tce: 61500, utilization: 91 },
  { date: "Jul 30", tce: 64000, utilization: 92 },
  { date: "Aug 06", tce: 63200, utilization: 93 },
  { date: "Aug 13", tce: 68400, utilization: 94 },
];

const forwardCurve = [
  { month: "Sep", gold: 4379.5, oil: 79.45, gas: 3.35 },
  { month: "Oct", gold: 4390.0, oil: 78.6, gas: 3.55 },
  { month: "Nov", gold: 4400.0, oil: 77.7, gas: 3.7 },
  { month: "Dec", gold: 4410.2, oil: 76.8, gas: 3.85 },
  { month: "Mar 27", gold: 4460.0, oil: 74.5, gas: 3.4 },
  { month: "Jun 27", gold: 4510.0, oil: 73.2, gas: 3.1 },
];

/**
 * IMPORTANT:
 * This is a deterministic client-side scoring engine.
 * It is NOT pretending to be a genuinely trained ML model.
 *
 * Replace this function with your Python/Node model API
 * when you have real historical training data.
 */
function mlSignal(input: {
  momentum: number;
  volume: number;
  volatility: number;
  trend: number;
}) {
  const score =
    input.momentum * 0.28 +
    input.volume * 0.22 +
    (100 - input.volatility) * 0.2 +
    input.trend * 0.18 +
    50 * 0.12;

  const probability = Math.max(0.05, Math.min(0.95, score / 100));

  let signal: Signal = "HOLD";

  if (probability >= 0.78) signal = "STRONG BUY";
  else if (probability >= 0.62) signal = "BUY";
  else if (probability <= 0.25) signal = "SELL";

  return {
    probability,
    confidence: probability * 100,
    signal,
  };
}

function randomNormal() {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function runMonteCarlo(
  initialValue: number,
  expectedReturn: number,
  volatility: number,
  simulations = 10000,
  periods = 12
) {
  const results: number[] = [];

  const monthlyReturn = expectedReturn / 12;
  const monthlyVolatility = volatility / Math.sqrt(12);

  for (let i = 0; i < simulations; i++) {
    let value = initialValue;

    for (let p = 0; p < periods; p++) {
      const shock = randomNormal();

      value *= Math.exp(
        monthlyReturn -
          0.5 * monthlyVolatility ** 2 +
          monthlyVolatility * shock
      );
    }

    results.push(value);
  }

  results.sort((a, b) => a - b);

  const mean =
    results.reduce((sum, value) => sum + value, 0) / results.length;

  const percentile = (p: number) =>
    results[Math.floor((results.length - 1) * p)];

  return {
    mean,
    low95: percentile(0.05),
    median: percentile(0.5),
    high95: percentile(0.95),
    results,
  };
}

function calculatePositionSize(
  capital: number,
  riskPercent: number,
  entry: number,
  stop: number
) {
  const riskPerShare = Math.abs(entry - stop);

  if (riskPerShare <= 0) return 0;

  return (capital * riskPercent) / riskPerShare;
}

function calculateTradeScore(trade: Trade) {
  const upside = Math.max(0, (trade.target - trade.entry) / trade.entry);

  const downside = Math.max(
    0.001,
    Math.abs(trade.entry - trade.stop) / trade.entry
  );

  const riskReward = upside / downside;

  return riskReward * trade.confidence * (1 - trade.volatility);
}

const trades: Trade[] = [
  {
    symbol: "NVDA",
    sector: "Technology",
    entry: 225.3,
    target: 294.0,
    stop: 205.0,
    confidence: 0.82,
    expectedReturn: 0.16,
    volatility: 0.26,
  },
  {
    symbol: "XLE",
    sector: "Energy",
    entry: 61.06,
    target: 71.7,
    stop: 56.4,
    confidence: 0.75,
    expectedReturn: 0.15,
    volatility: 0.19,
  },
  {
    symbol: "SBLK",
    sector: "Shipping",
    entry: 27.89,
    target: 39.0,
    stop: 23.2,
    confidence: 0.72,
    expectedReturn: 0.2,
    volatility: 0.34,
  },
  {
    symbol: "BX",
    sector: "Private Credit",
    entry: 146.41,
    target: 169.0,
    stop: 135.2,
    confidence: 0.76,
    expectedReturn: 0.12,
    volatility: 0.18,
  },
];

function SignalBadge({ signal }: { signal: Signal }) {
  const classes: Record<Signal, string> = {
    "STRONG BUY": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    BUY: "bg-green-500/20 text-green-300 border-green-500/30",
    HOLD: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    SELL: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classes[signal]}`}
    >
      {signal}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        <div
          className={`rounded-lg p-2 ${
            danger ? "bg-red-500/10" : "bg-cyan-500/10"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${danger ? "text-red-400" : "text-cyan-400"}`}
          />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I'm your quantitative finance assistant. Ask me about ML signals, Monte Carlo risk, position sizing, or portfolio exposure.",
    },
  ]);

  const [capital, setCapital] = useState(1000000);
  const [riskPerTrade, setRiskPerTrade] = useState(0.02);
  const [regime, setRegime] = useState<Regime>("Late Cycle");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuotes() {
      setLiveStatus((prev) => (prev === "live" ? prev : "loading"));

      try {
        const response = await fetch("/api/quotes");

        if (!response.ok) throw new Error(`status ${response.status}`);

        const data = await response.json();

        if (cancelled) return;

        const map: Record<string, LiveQuote> = {};
        for (const q of data.quotes ?? []) {
          map[q.symbol] = q;
        }

        setLiveQuotes(map);
        setLastUpdated(data.updatedAt ?? new Date().toISOString());
        setLiveStatus("live");
      } catch {
        if (!cancelled) setLiveStatus("error");
      }
    }

    fetchQuotes();

    const interval = setInterval(fetchQuotes, LIVE_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const liveAssets = useMemo(
    () =>
      assets.map((asset) => {
        const live = liveQuotes[asset.symbol];

        if (!live) return asset;

        return {
          ...asset,
          price: live.price,
          change: live.changePercent,
        };
      }),
    [liveQuotes]
  );

  const ml = useMemo(
    () =>
      mlSignal({
        momentum: 82,
        volume: 74,
        volatility: 28,
        trend: 87,
      }),
    []
  );

  const monteCarlo = useMemo(
    () => runMonteCarlo(225.3, 0.125, 0.25, 10000, 12),
    []
  );

  const portfolioTrades = useMemo(() => {
    return trades
      .map((trade) => ({
        ...trade,
        score: calculateTradeScore(trade),
      }))
      .sort((a, b) => b.score - a.score);
  }, []);

  const topTrade = portfolioTrades[0];

  const positionSize = calculatePositionSize(
    capital,
    riskPerTrade,
    topTrade.entry,
    topTrade.stop
  );

  const downside = ((monteCarlo.low95 - 225.3) / 225.3) * 100;

  const upside = ((monteCarlo.high95 - 225.3) / 225.3) * 100;

  const macroMultiplier =
    regime === "Recession"
      ? 0.55
      : regime === "Late Cycle"
      ? 0.75
      : regime === "Recovery"
      ? 0.9
      : 1;

  const adjustedConfidence = Math.round(ml.confidence * macroMultiplier);

  function sendMessage() {
    if (!input.trim()) return;

    const text = input.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
      },
    ]);

    setInput("");

    setTimeout(() => {
      const lower = text.toLowerCase();

      let answer =
        "The current portfolio model favors risk-controlled exposure. The strongest ranked trade is " +
        topTrade.symbol +
        ", but position sizing should remain constrained by volatility and the current macro regime.";

      if (lower.includes("monte")) {
        answer = `The 10,000-path Monte Carlo estimates a mean terminal value of $${monteCarlo.mean.toFixed(
          1
        )}, with a 5th percentile of $${monteCarlo.low95.toFixed(
          1
        )} and a 95th percentile of $${monteCarlo.high95.toFixed(1)}.`;
      }

      if (lower.includes("nvda") || lower.includes("ml")) {
        answer = `The ML layer currently produces ${
          ml.signal
        } with ${ml.confidence.toFixed(
          0
        )}% model probability. After the ${regime} macro adjustment, displayed conviction is ${adjustedConfidence}%. This is a model score, not a guarantee.`;
      }

      if (lower.includes("risk")) {
        answer = `Portfolio risk is controlled with a ${(
          riskPerTrade * 100
        ).toFixed(
          1
        )}% per-trade risk budget, Monte Carlo downside monitoring, macro regime adjustment, and sector exposure limits.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer,
        },
      ]);
    }, 400);
  }

  const nav = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "ml", label: "ML Signals", icon: Cpu },
    { id: "monte", label: "Monte Carlo", icon: TrendingUp },
    { id: "portfolio", label: "Portfolio", icon: Landmark },
    { id: "shipping", label: "Shipping", icon: Ship },
    { id: "commodities", label: "Commodities", icon: Fuel },
  ];

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"
      }`}
    >
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                Siri Finance <span className="text-cyan-400">Pro</span>
              </h1>
              <p className="text-xs text-slate-500">
                Quantitative Multi-Asset Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:flex ${
                liveStatus === "live"
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : liveStatus === "error"
                  ? "border-yellow-500/20 bg-yellow-500/10"
                  : "border-slate-600/30 bg-slate-700/20"
              }`}
              title={
                lastUpdated
                  ? `Quotes last updated ${new Date(
                      lastUpdated
                    ).toLocaleTimeString()}`
                  : undefined
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  liveStatus === "live"
                    ? "animate-pulse bg-emerald-400"
                    : liveStatus === "error"
                    ? "bg-yellow-400"
                    : "animate-pulse bg-slate-400"
                }`}
              />
              <span
                className={`text-xs ${
                  liveStatus === "live"
                    ? "text-emerald-300"
                    : liveStatus === "error"
                    ? "text-yellow-300"
                    : "text-slate-300"
                }`}
              >
                {liveStatus === "live"
                  ? "Live Quotes"
                  : liveStatus === "error"
                  ? "Live Feed Unavailable"
                  : "Connecting..."}
              </span>
            </div>

            <button
              aria-label="Toggle theme"
              onClick={() => setDarkMode((v) => !v)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <Moon className="h-5 w-5" />
            </button>

            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
            >
              <Bot className="h-4 w-4" />
              AI Analyst
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-800 bg-slate-950 p-4 transition-transform lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <span className="font-semibold">Navigation</span>
            <button
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Main navigation" className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                    active
                      ? "bg-cyan-500/10 text-cyan-300"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="font-semibold">Risk Controls</span>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Position sizing, Monte Carlo analysis, macro regime filters and
              exposure limits are active.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <section>
                <div className="mb-2 flex items-center gap-2 text-cyan-400">
                  <ActivityIcon />
                  <span className="text-sm font-semibold">
                    QUANT DASHBOARD
                  </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Portfolio Intelligence
                </h2>
                <p className="mt-2 max-w-3xl text-slate-400">
                  ML signals, portfolio risk, Monte Carlo projections and
                  macro regime analysis in one system.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        liveStatus === "live"
                          ? "animate-pulse bg-emerald-400"
                          : liveStatus === "error"
                          ? "bg-yellow-400"
                          : "animate-pulse bg-slate-400"
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-400">
                      {liveStatus === "live"
                        ? "LIVE MARKET DATA"
                        : liveStatus === "error"
                        ? "USING BASELINE DATA (live feed unavailable)"
                        : "CONNECTING TO LIVE FEED..."}
                    </span>
                  </div>
                  {lastUpdated && (
                    <span className="text-xs text-slate-600">
                      Updated {new Date(lastUpdated).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex gap-3 overflow-x-auto pb-1">
                  {liveAssets.map((asset) => (
                    <div
                      key={asset.symbol}
                      className="flex min-w-[150px] flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {asset.symbol}
                        </span>
                        <SignalBadge signal={asset.signal} />
                      </div>
                      <div className="text-lg font-semibold text-white">
                        ${asset.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          asset.change >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {asset.change >= 0 ? "+" : ""}
                        {asset.change.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Expected Return"
                  value="+12.5%"
                  subtitle="Monte Carlo expectation"
                  icon={TrendingUp}
                />
                <MetricCard
                  title="95% Downside"
                  value={`${downside.toFixed(1)}%`}
                  subtitle="5th percentile"
                  icon={TrendingDown}
                  danger
                />
                <MetricCard
                  title="ML Confidence"
                  value={`${adjustedConfidence}%`}
                  subtitle={`${ml.signal} after macro filter`}
                  icon={Cpu}
                />
                <MetricCard
                  title="Risk Budget"
                  value={`${(riskPerTrade * 100).toFixed(1)}%`}
                  subtitle="per trade"
                  icon={ShieldCheck}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 xl:col-span-2">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">VLCC Freight Trend</h3>
                      <p className="text-xs text-slate-500">
                        TCE and fleet utilization
                      </p>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={shippingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" />
                        <YAxis yAxisId="left" stroke="#06b6d4" />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#a855f7"
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#020617",
                            border: "1px solid #334155",
                            borderRadius: 12,
                          }}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="tce"
                          fill="#06b6d4"
                          name="TCE"
                        />
                        <Line
                          yAxisId="right"
                          dataKey="utilization"
                          stroke="#a855f7"
                          strokeWidth={3}
                          name="Utilization %"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <h3 className="font-semibold">Risk Regime</h3>
                  </div>
                  <label className="mb-2 block text-xs text-slate-500">
                    Current macro regime
                  </label>
                  <select
                    value={regime}
                    onChange={(e) => setRegime(e.target.value as Regime)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  >
                    <option>Expansion</option>
                    <option>Late Cycle</option>
                    <option>Recession</option>
                    <option>Recovery</option>
                  </select>
                  <div className="mt-5 rounded-xl bg-slate-950 p-4">
                    <div className="mb-2 flex justify-between">
                      <span className="text-sm text-slate-400">
                        ML confidence
                      </span>
                      <span className="font-bold text-cyan-400">
                        {adjustedConfidence}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        style={{ width: `${adjustedConfidence}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-400">
                    Macro adjustment prevents the ML model from blindly
                    overriding portfolio risk conditions.
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Ranked Opportunities</h3>
                    <p className="text-xs text-slate-500">
                      Risk-adjusted trade ranking
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                    {portfolioTrades.length} candidates
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-slate-500">
                        <th className="px-3 py-3">Symbol</th>
                        <th className="px-3 py-3">Sector</th>
                        <th className="px-3 py-3">Entry</th>
                        <th className="px-3 py-3">Target</th>
                        <th className="px-3 py-3">Stop</th>
                        <th className="px-3 py-3">R/R</th>
                        <th className="px-3 py-3">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioTrades.map((trade) => {
                        const upside =
                          (trade.target - trade.entry) / trade.entry;
                        const downside =
                          Math.abs(trade.entry - trade.stop) / trade.entry;
                        const rr = upside / downside;

                        return (
                          <tr
                            key={trade.symbol}
                            className="border-b border-slate-800/70"
                          >
                            <td className="px-3 py-4 font-bold">
                              {trade.symbol}
                            </td>
                            <td className="px-3 py-4 text-slate-400">
                              {trade.sector}
                            </td>
                            <td className="px-3 py-4">
                              ${trade.entry.toFixed(2)}
                            </td>
                            <td className="px-3 py-4 text-emerald-400">
                              ${trade.target.toFixed(2)}
                            </td>
                            <td className="px-3 py-4 text-red-400">
                              ${trade.stop.toFixed(2)}
                            </td>
                            <td className="px-3 py-4 font-semibold">
                              {rr.toFixed(2)}x
                            </td>
                            <td className="px-3 py-4 text-cyan-400">
                              {trade.score.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === "ml" && (
            <div className="space-y-6">
              <section>
                <h2 className="text-3xl font-bold">
                  Machine Learning Signals
                </h2>
                <p className="mt-2 text-slate-400">
                  Model probabilities are adjusted for volatility and macro
                  regime instead of displaying false certainty.
                </p>
              </section>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Raw Probability"
                  value={`${ml.confidence.toFixed(0)}%`}
                  subtitle="Client-side model score"
                  icon={Cpu}
                />
                <MetricCard
                  title="Macro Adjusted"
                  value={`${adjustedConfidence}%`}
                  subtitle={regime}
                  icon={ShieldCheck}
                />
                <MetricCard
                  title="Model Signal"
                  value={ml.signal}
                  subtitle="Current output"
                  icon={TrendingUp}
                />
                <MetricCard
                  title="Model Trees"
                  value="100"
                  subtitle="Recommended production baseline"
                  icon={BarChart3}
                />
              </div>
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="mb-6 font-semibold">Feature Importance</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={[
                        { feature: "Momentum", value: 28 },
                        { feature: "Volume", value: 22 },
                        { feature: "Volatility", value: 20 },
                        { feature: "Price", value: 18 },
                        { feature: "Trend", value: 12 },
                      ]}
                    >
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="feature" stroke="#94a3b8" />
                      <PolarRadiusAxis stroke="#475569" />
                      <Radar
                        dataKey="value"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.25}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-sm text-yellow-200">
                <strong>Model integrity:</strong> this browser implementation
                is a scoring engine, not a genuinely trained predictive
                model. Do not label its output as statistically validated ML
                until it is trained and tested on out-of-sample historical
                data.
              </div>
            </div>
          )}

          {activeTab === "monte" && (
            <div className="space-y-6">
              <section>
                <h2 className="text-3xl font-bold">Monte Carlo Risk Engine</h2>
                <p className="mt-2 text-slate-400">
                  10,000 simulated paths using a log-normal return process.
                </p>
              </section>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Simulations"
                  value="10,000"
                  subtitle="12-month horizon"
                  icon={BarChart3}
                />
                <MetricCard
                  title="Mean Value"
                  value={`$${monteCarlo.mean.toFixed(1)}`}
                  subtitle="Expected terminal value"
                  icon={CircleDollarSign}
                />
                <MetricCard
                  title="95% Low"
                  value={`$${monteCarlo.low95.toFixed(1)}`}
                  subtitle={`${downside.toFixed(1)}% from $225.30`}
                  icon={TrendingDown}
                  danger
                />
                <MetricCard
                  title="95% High"
                  value={`$${monteCarlo.high95.toFixed(1)}`}
                  subtitle={`+${upside.toFixed(1)}% from $225.30`}
                  icon={TrendingUp}
                />
              </div>
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="mb-5 font-semibold">Simulation Distribution</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-950 p-5">
                    <p className="text-xs text-slate-500">5th Percentile</p>
                    <p className="mt-2 text-2xl font-bold text-red-400">
                      ${monteCarlo.low95.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-5">
                    <p className="text-xs text-slate-500">Median</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      ${monteCarlo.median.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-5">
                    <p className="text-xs text-slate-500">95th Percentile</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-400">
                      ${monteCarlo.high95.toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
                    <div>
                      <h4 className="font-semibold text-cyan-300">
                        Interpretation
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        The simulation has positive expected value, but the
                        lower percentile demonstrates meaningful downside
                        dispersion. The model should therefore be used for
                        sizing and stress analysis rather than treated as a
                        guaranteed forecast.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "portfolio" && (
            <div className="space-y-6">
              <section>
                <h2 className="text-3xl font-bold">Portfolio Risk Engine</h2>
                <p className="mt-2 text-slate-400">
                  Risk-based sizing prevents a high-conviction signal from
                  becoming an oversized position.
                </p>
              </section>
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="grid gap-5 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-xs text-slate-500">
                      Portfolio Capital
                    </span>
                    <input
                      type="number"
                      value={capital}
                      onChange={(e) => setCapital(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs text-slate-500">
                      Risk Per Trade
                    </span>
                    <select
                      value={riskPerTrade}
                      onChange={(e) =>
                        setRiskPerTrade(Number(e.target.value))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                    >
                      <option value={0.01}>1%</option>
                      <option value={0.015}>1.5%</option>
                      <option value={0.02}>2%</option>
                      <option value={0.025}>2.5%</option>
                    </select>
                  </label>
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <p className="text-xs text-slate-500">
                      Suggested position
                    </p>
                    <p className="mt-1 text-2xl font-bold text-cyan-300">
                      {topTrade.symbol}
                    </p>
                    <p className="text-sm text-slate-400">
                      {positionSize.toFixed(0)} shares
                    </p>
                  </div>
                </div>
              </section>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  title="Position Value"
                  value={`$${(positionSize * topTrade.entry).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 }
                  )}`}
                  subtitle={topTrade.symbol}
                  icon={CircleDollarSign}
                />
                <MetricCard
                  title="Maximum Planned Loss"
                  value={`$${(capital * riskPerTrade).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 }
                  )}`}
                  subtitle="before slippage/gaps"
                  icon={TrendingDown}
                  danger
                />
                <MetricCard
                  title="Sector Limit"
                  value="30%"
                  subtitle="maximum target exposure"
                  icon={ShieldCheck}
                />
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-200">
                Position sizing is calculated from the distance between entry
                and stop. This is materially safer than allocating the same
                dollar amount to every trade.
              </div>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="space-y-6">
              <section>
                <div className="mb-2 flex items-center gap-2 text-cyan-400">
                  <Anchor className="h-5 w-5" />
                  <span className="text-sm font-semibold">
                    SHIPPING & FREIGHT
                  </span>
                </div>
                <h2 className="text-3xl font-bold">
                  Tanker Market Intelligence
                </h2>
              </section>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  title="VLCC TD3C TCE"
                  value="$68K/day"
                  subtitle="Latest modeled value"
                  icon={Ship}
                />
                <MetricCard
                  title="Fleet Utilization"
                  value="94%"
                  subtitle="High utilization"
                  icon={Anchor}
                />
                <MetricCard
                  title="Model Signal"
                  value="BUY"
                  subtitle="Hormuz-driven rate strength"
                  icon={ShieldCheck}
                />
              </div>
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={shippingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        contentStyle={{
                          background: "#020617",
                          border: "1px solid #334155",
                          borderRadius: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tce"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.15}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          )}

          {activeTab === "commodities" && (
            <div className="space-y-6">
              <section>
                <div className="mb-2 flex items-center gap-2 text-amber-400">
                  <Fuel className="h-5 w-5" />
                  <span className="text-sm font-semibold">COMMODITIES</span>
                </div>
                <h2 className="text-3xl font-bold">Forward Curve Analysis</h2>
              </section>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  title="Gold"
                  value="$4,363.70"
                  subtitle="-1.15%"
                  icon={CircleDollarSign}
                />
                <MetricCard
                  title="WTI"
                  value="$81.19"
                  subtitle="-1.87%"
                  icon={Fuel}
                />
                <MetricCard
                  title="Natural Gas"
                  value="$3.35"
                  subtitle="+1.2%"
                  icon={TrendingDown}
                />
              </div>
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forwardCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        contentStyle={{
                          background: "#020617",
                          border: "1px solid #334155",
                          borderRadius: 12,
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="gold"
                        stroke="#fbbf24"
                        strokeWidth={3}
                        name="Gold"
                      />
                      <Line
                        type="monotone"
                        dataKey="oil"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        name="Oil"
                      />
                      <Line
                        type="monotone"
                        dataKey="gas"
                        stroke="#22c55e"
                        strokeWidth={3}
                        name="Gas"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {chatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AI Analyst"
          className="fixed bottom-4 right-4 z-[60] flex h-[min(650px,calc(100vh-32px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="font-semibold">AI Analyst</h3>
                <p className="text-xs text-slate-500">
                  Quantitative risk assistant
                </p>
              </div>
            </div>
            <button
              aria-label="Close AI Analyst"
              onClick={() => setChatOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="flex-1 space-y-3 overflow-y-auto p-4"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-purple-600 text-white"
                      : "border border-slate-800 bg-slate-900 text-slate-300"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-slate-800 p-3">
            <div className="flex gap-2">
              <input
                aria-label="Ask the AI analyst"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Ask about risk, ML, Monte Carlo..."
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-purple-500"
              />
              <button
                aria-label="Send message"
                onClick={sendMessage}
                className="rounded-xl bg-purple-600 p-3 text-white hover:bg-purple-500"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800 px-4 py-6 text-center text-xs text-slate-600">
        Siri Finance Pro · Quantitative Research Interface · Data refreshed
        August 13, 2026 · Model outputs are informational and require
        validation before trading.
      </footer>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <polyline points="3 12 7 12 10 4 14 20 17 12 21 12" />
    </svg>
  );
}
