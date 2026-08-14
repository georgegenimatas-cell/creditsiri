import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Zap,
Ship, Gem, Cpu, Factory, Landmark, AlertTriangle, CheckCircle2, ArrowUpRight, BookOpen, Sigma, MessageCircle,
} from 'lucide-react';

type Recommendation = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';

interface PricePoint {
date: string;
close: number;
}

interface BaseInstrument {
name: string;
symbol: string;
type: 'Stock' | 'ETF' | 'Futures' | 'BDC';
currentPrice: number;
change: number;
changePercent: number;
recommendation: Recommendation;
prices: PricePoint[];
note?: string;
}

interface StockInstrument extends BaseInstrument {
type: 'Stock';
marketCap: string;
peRatio: number;
dividendYield?: number;
fiftyTwoWeekHigh?: number;
fiftyTwoWeekLow?: number;
aiGrowthScore?: number;
capexGrowth?: number;
}

interface EtfInstrument extends BaseInstrument {
type: 'ETF';
marketCap: string;
expenseRatio?: number;
dividendYield?: number;
}

interface FuturesInstrument extends BaseInstrument {
type: 'Futures';
unit: string;
forwardCurve: { month: string; price: number }[];
}

interface BdcInstrument extends BaseInstrument {
type: 'BDC' | 'Stock';
aum: string;
yield: number;
creditSpread: number;
}

type Instrument = StockInstrument | EtfInstrument | FuturesInstrument | BdcInstrument;

interface SectorAnalysis {
sentiment: 'Bullish' | 'Neutral' | 'Bearish' | 'Cautious';
trend: 'up' | 'down' | 'flat';
keyPoints: string[];
outlook: string;
riskFactors: string[];
opportunities: string[];
}

interface Sector {
id: string;
label: string;
icon: typeof Ship;
color: string;
analysis: SectorAnalysis;
instruments: Record<string, Instrument>;
}

const shippingData: Record<string, Instrument> = {
ZIM: {
name: 'ZIM Integrated Shipping', symbol: 'ZIM', type: 'Stock',
currentPrice: 25.27, change: 0.74, changePercent: 3.02,
marketCap: '3.05B', peRatio: 8.43, dividendYield: 4.95,
recommendation: 'HOLD',
prices: [{ date: 'Jul 16', close: 19.80 }, { date: 'Jul 30', close: 22.15 }, { date: 'Aug 13', close: 25.27 }],
note: 'Volatile on Hapag-Lloyd merger regulatory delay; earnings Aug 19.',
} as StockInstrument,
SBLK: {
name: 'Star Bulk Carriers', symbol: 'SBLK', type: 'Stock',
currentPrice: 27.89, change: 0.29, changePercent: 1.05,
marketCap: '3.20B', peRatio: 10.68, dividendYield: 3.69,
recommendation: 'STRONG BUY',
prices: [{ date: 'Jul 16', close: 24.10 }, { date: 'Jul 30', close: 26.40 }, { date: 'Aug 13', close: 27.89 }],
} as StockInstrument,
FRO: {
name: 'Frontline PLC', symbol: 'FRO', type: 'Stock',
currentPrice: 37.97, change: 0.45, changePercent: 1.20,
marketCap: '8.45B', peRatio: 9.82, dividendYield: 7.84,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 34.20 }, { date: 'Jul 30', close: 36.10 }, { date: 'Aug 13', close: 37.97 }],
} as StockInstrument,
CMBT: {
name: 'CMB.TECH NV', symbol: 'CMBT', type: 'Stock',
currentPrice: 16.96, change: 0.21, changePercent: 1.25,
marketCap: '4.92B', peRatio: 13.14, dividendYield: 4.72,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 15.10 }, { date: 'Jul 30', close: 16.30 }, { date: 'Aug 13', close: 16.96 }],
note: 'Successor to Golden Ocean (GOGL), which merged into CMB.TECH in 2025.',
} as StockInstrument,
};

const commoditiesData: Record<string, Instrument> = {
'GC=F': {
name: 'Gold Futures', symbol: 'GC=F', type: 'Futures',
currentPrice: 4363.70, change: -50.70, changePercent: -1.15, unit: '$/oz',

recommendation: 'HOLD',
forwardCurve: [{ month: 'Spot', price: 4363.70 }, { month: 'Sep', price: 4379.50 }, { month: 'Dec', price: 4410.20 }],
prices: [{ date: 'Jul 16', close: 4180.00 }, { date: 'Jul 30', close: 4290.00 }, { date: 'Aug 13', close: 4363.70 }],
} as FuturesInstrument,
'CL=F': {
name: 'Crude Oil WTI', symbol: 'CL=F', type: 'Futures',
currentPrice: 81.19, change: -1.55, changePercent: -1.87, unit: '$/bbl',
recommendation: 'BUY',
forwardCurve: [{ month: 'Spot', price: 81.19 }, { month: 'Sep', price: 79.45 }, { month: 'Dec', price: 76.80 }],
prices: [{ date: 'Jul 16', close: 70.20 }, { date: 'Jul 30', close: 76.50 }, { date: 'Aug 13', close: 81.19 }],
} as FuturesInstrument,
GLD: {
name: 'SPDR Gold ETF', symbol: 'GLD', type: 'ETF',
currentPrice: 398.96, change: -5.96, changePercent: -1.47,
marketCap: '109.4B', expenseRatio: 0.40,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 380.10 }, { date: 'Jul 30', close: 392.40 }, { date: 'Aug 13', close: 398.96 }],
} as EtfInstrument,
DBC: {
name: 'Invesco DB Commodity', symbol: 'DBC', type: 'ETF',
currentPrice: 29.85, change: 0.45, changePercent: 1.53,
marketCap: '1.6B', expenseRatio: 0.85,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 27.10 }, { date: 'Jul 30', close: 28.60 }, { date: 'Aug 13', close: 29.85 }],
} as EtfInstrument,
};

const technologyData: Record<string, Instrument> = {
NVDA: {
name: 'NVIDIA Corp.', symbol: 'NVDA', type: 'Stock',
currentPrice: 225.30, change: 1.21, changePercent: 0.54,
marketCap: '5.46T', peRatio: 34.16, aiGrowthScore: 96,
fiftyTwoWeekHigh: 236.54, fiftyTwoWeekLow: 164.07,
recommendation: 'STRONG BUY',
prices: [{ date: 'Jul 16', close: 190.40 }, { date: 'Jul 30', close: 205.60 }, { date: 'Aug 13', close: 225.30 }],
note: 'Q2 FY27 earnings due Aug 26.',
} as StockInstrument,
AAPL: {
name: 'Apple Inc.', symbol: 'AAPL', type: 'Stock',
currentPrice: 305.26, change: 3.01, changePercent: 1.00,
marketCap: '4.46T', peRatio: 34.98, aiGrowthScore: 70,
fiftyTwoWeekHigh: 344.57, fiftyTwoWeekLow: 223.78,
recommendation: 'HOLD',
prices: [{ date: 'Jul 16', close: 335.20 }, { date: 'Jul 30', close: 326.15 }, { date: 'Aug 13', close: 305.26 }],
note: 'Downgraded from Strong Buy to Hold after soft post-earnings guidance.',
} as StockInstrument,

recommendation: 'HOLD',
forwardCurve: [{ month: 'Spot', price: 4363.70 }, { month: 'Sep', price: 4379.50 }, { month: 'Dec', price: 4410.20 }],
prices: [{ date: 'Jul 16', close: 4180.00 }, { date: 'Jul 30', close: 4290.00 }, { date: 'Aug 13', close: 4363.70 }],
} as FuturesInstrument,
'CL=F': {
name: 'Crude Oil WTI', symbol: 'CL=F', type: 'Futures',
currentPrice: 81.19, change: -1.55, changePercent: -1.87, unit: '$/bbl',
recommendation: 'BUY',
forwardCurve: [{ month: 'Spot', price: 81.19 }, { month: 'Sep', price: 79.45 }, { month: 'Dec', price: 76.80 }],
prices: [{ date: 'Jul 16', close: 70.20 }, { date: 'Jul 30', close: 76.50 }, { date: 'Aug 13', close: 81.19 }],
} as FuturesInstrument,
GLD: {
name: 'SPDR Gold ETF', symbol: 'GLD', type: 'ETF',
currentPrice: 398.96, change: -5.96, changePercent: -1.47,
marketCap: '109.4B', expenseRatio: 0.40,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 380.10 }, { date: 'Jul 30', close: 392.40 }, { date: 'Aug 13', close: 398.96 }],
} as EtfInstrument,
DBC: {
name: 'Invesco DB Commodity', symbol: 'DBC', type: 'ETF',
currentPrice: 29.85, change: 0.45, changePercent: 1.53,
marketCap: '1.6B', expenseRatio: 0.85,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 27.10 }, { date: 'Jul 30', close: 28.60 }, { date: 'Aug 13', close: 29.85 }],
} as EtfInstrument,
};

const technologyData: Record<string, Instrument> = {
NVDA: {
name: 'NVIDIA Corp.', symbol: 'NVDA', type: 'Stock',
currentPrice: 225.30, change: 1.21, changePercent: 0.54,
marketCap: '5.46T', peRatio: 34.16, aiGrowthScore: 96,
fiftyTwoWeekHigh: 236.54, fiftyTwoWeekLow: 164.07,
recommendation: 'STRONG BUY',
prices: [{ date: 'Jul 16', close: 190.40 }, { date: 'Jul 30', close: 205.60 }, { date: 'Aug 13', close: 225.30 }],
note: 'Q2 FY27 earnings due Aug 26.',
} as StockInstrument,
AAPL: {
name: 'Apple Inc.', symbol: 'AAPL', type: 'Stock',
currentPrice: 305.26, change: 3.01, changePercent: 1.00,
marketCap: '4.46T', peRatio: 34.98, aiGrowthScore: 70,
fiftyTwoWeekHigh: 344.57, fiftyTwoWeekLow: 223.78,
recommendation: 'HOLD',
prices: [{ date: 'Jul 16', close: 335.20 }, { date: 'Jul 30', close: 326.15 }, { date: 'Aug 13', close: 305.26 }],
note: 'Downgraded from Strong Buy to Hold after soft post-earnings guidance.',
} as StockInstrument,
MSFT: {
name: 'Microsoft Corp.', symbol: 'MSFT', type: 'Stock',
currentPrice: 496.88, change: 4.45, changePercent: 0.90,
marketCap: '3.66T', peRatio: 27.65, aiGrowthScore: 90,
fiftyTwoWeekHigh: 553.72, fiftyTwoWeekLow: 349.20,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 465.10 }, { date: 'Jul 30', close: 483.40 }, { date: 'Aug 13', close: 496.88 }],
} as StockInstrument,
AMD: {
name: 'AMD', symbol: 'AMD', type: 'Stock',
currentPrice: 493.52, change: 10.59, changePercent: 2.19,
marketCap: '788B', peRatio: 123.37, aiGrowthScore: 90,
fiftyTwoWeekHigh: 584.73, fiftyTwoWeekLow: 149.22,
recommendation: 'STRONG BUY',
prices: [{ date: 'Jul 16', close: 420.30 }, { date: 'Jul 30', close: 460.80 }, { date: 'Aug 13', close: 493.52 }],
} as StockInstrument,
SMH: {
name: 'VanEck Semiconductor ETF', symbol: 'SMH', type: 'ETF',
currentPrice: 589.12, change: 4.29, changePercent: 0.73,
marketCap: '71.44B', expenseRatio: 0.35,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 510.20 }, { date: 'Jul 30', close: 555.60 }, { date: 'Aug 13', close: 589.12 }],
} as EtfInstrument,
};

const industrialsData: Record<string, Instrument> = {
CAT: {
name: 'Caterpillar Inc.', symbol: 'CAT', type: 'Stock',
currentPrice: 837.58, change: 7.58, changePercent: 0.91,
marketCap: '385B', peRatio: 36.29, capexGrowth: 14.2,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 790.40 }, { date: 'Jul 30', close: 915.20 }, { date: 'Aug 13', close: 837.58 }],
note: 'Record $72B backlog (+92% YoY) on AI-datacenter and infra demand.',
} as StockInstrument,
GE: {
name: 'GE Aerospace', symbol: 'GE', type: 'Stock',
currentPrice: 370.15, change: -4.85, changePercent: -1.29,
marketCap: '363.8B', peRatio: 42.48, capexGrowth: 11.0,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 352.10 }, { date: 'Jul 30', close: 365.40 }, { date: 'Aug 13', close: 370.15 }],
} as StockInstrument,
HON: {
name: 'Honeywell', symbol: 'HON', type: 'Stock',
currentPrice: 243.05, change: 1.85, changePercent: 0.77,
marketCap: '77.0B', peRatio: 9.39, capexGrowth: 5.5,
recommendation: 'HOLD',
prices: [{ date: 'Jul 16', close: 225.40 }, { date: 'Jul 30', close: 236.80 }, { date: 'Aug 13', close: 243.05 }],
note: 'Post spinoff of Honeywell Aerospace (HONA) + 1-for-2 reverse split.',
} as StockInstrument,
XLI: {
name: 'Industrial Select ETF', symbol: 'XLI', type: 'ETF',
currentPrice: 185.96, change: 1.10, changePercent: 0.60,
marketCap: '33.93B', expenseRatio: 0.08,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 172.30 }, { date: 'Jul 30', close: 180.50 }, { date: 'Aug 13', close: 185.96 }],
} as EtfInstrument,
};

const privateCreditData: Record<string, Instrument> = {
BX: {
name: 'Blackstone Inc.', symbol: 'BX', type: 'Stock',
currentPrice: 146.41, change: -0.76, changePercent: -0.52,
aum: '1.35T', yield: 3.57, creditSpread: 410,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 128.40 }, { date: 'Jul 30', close: 141.20 }, { date: 'Aug 13', close: 146.41 }],
} as BdcInstrument,
ARES: {
name: 'Ares Management', symbol: 'ARES', type: 'Stock',
currentPrice: 143.04, change: 1.20, changePercent: 0.85,
aum: '622.5B', yield: 3.77, creditSpread: 375,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 120.30 }, { date: 'Jul 30', close: 135.60 }, { date: 'Aug 13', close: 143.04 }],
} as BdcInstrument,
KKR: {
name: 'KKR & Co.', symbol: 'KKR', type: 'Stock',
currentPrice: 110.97, change: 7.14, changePercent: 6.88,
aum: '796B', yield: 0.7, creditSpread: 350,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 95.40 }, { date: 'Jul 30', close: 102.80 }, { date: 'Aug 13', close: 110.97 }],
} as BdcInstrument,
ARCC: {
name: 'Ares Capital BDC', symbol: 'ARCC', type: 'BDC',
currentPrice: 18.76, change: 0.11, changePercent: 0.59,
aum: '28B', yield: 10.2, creditSpread: 470,
recommendation: 'BUY',
prices: [{ date: 'Jul 16', close: 18.10 }, { date: 'Jul 30', close: 18.50 }, { date: 'Aug 13', close: 18.76 }],
note: 'Non-accruals rising (2.4% amortized cost); dividend coverage narrowing.',
} as BdcInstrument,
};

const sectors: Sector[] = [
{
id: 'shipping', label: 'Shipping & Tankers', icon: Ship, color: 'blue',
analysis: {
sentiment: 'Bullish', trend: 'up',
keyPoints: [
'Hormuz tensions push VLCC and Suezmax rates sharply higher',
'ZIM–Hapag-Lloyd merger hits a regulatory roadblock',
'Golden Ocean now fully absorbed into CMB.TECH after 2025 merger',
'Newbuild orderbook remains near a 20-year low',
],
outlook: 'Tanker rates elevated on Middle East risk; dry-bulk consolidation reshaping the sector.',
riskFactors: ['Geopolitical de-escalation', 'Freight rate volatility', 'Merger/regulatory uncertainty'],
opportunities: ['Elevated crude tanker rates', 'CMB.TECH consolidation scale', 'High dividend yields'],
},
instruments: shippingData,
},
{
id: 'commodities', label: 'Commodities', icon: Gem, color: 'amber',
analysis: {
sentiment: 'Bullish', trend: 'up',
keyPoints: [
'Gold breaks above $4,300/oz on central-bank buying and rate-cut bets',
'WTI crude jumps past $80 on Strait of Hormuz disruption',
'Central banks bought ~289 tonnes of gold in Q2 2026 alone',
'OPEC cuts its 2026 demand-growth forecast for a 4th straight month',
],
outlook: 'Precious metals in a structural bull market; energy driven by a geopolitical risk premium.',
riskFactors: ['Fed policy reversal', 'Hormuz de-escalation could cut oil premium', 'Profit-taking after rapid gains'],
opportunities: ['Gold/silver momentum', 'Energy geopolitical premium', 'Broad commodity diversification'],
},
instruments: commoditiesData,
},
{
id: 'technology', label: 'Technology', icon: Cpu, color: 'purple',
analysis: {
sentiment: 'Bullish', trend: 'up',
keyPoints: [
'AI capex accelerating on $500B+ NVIDIA-led financing pact',
'NVIDIA and AMD near record highs ahead of NVDA\u2019s Aug 26 earnings',
'Apple slides on soft guidance and an AI trade-secrets suit vs. OpenAI',
'Memory/HBM cost inflation squeezing hardware margins',
],
outlook: 'AI infrastructure remains the dominant theme; dispersion widening between winners and laggards.',
riskFactors: ['Valuation compression', 'Regulatory/antitrust scrutiny', 'Memory cost inflation'],
opportunities: ['AI infrastructure buildout', 'Enterprise AI adoption', 'Semiconductor equipment demand'],
},
instruments: technologyData,
},
{
id: 'industrials', label: 'Industrials', icon: Factory, color: 'slate',
analysis: {
sentiment: 'Bullish', trend: 'up',
keyPoints: [
'Caterpillar posts a record $72B backlog, +92% YoY, on AI-datacenter demand',
'Honeywell completes its Aerospace spinoff (Nasdaq: HONA) plus a 1-for-2 reverse split',
'GE Aerospace supply chain and margins remain closely watched',
'Reshoring and infrastructure-bill spending continue to support orders',
],
outlook: 'Mid-cycle expansion with AI-driven infrastructure and reshoring tailwinds.',
riskFactors: ['Labor costs', 'Supply chain', 'Rate sensitivity'],
opportunities: ['Infrastructure spending', 'Automation', 'Defense'],
},
instruments: industrialsData,
},

{
id: 'privateCredit', label: 'Private Credit', icon: Landmark, color: 'emerald',
analysis: {
sentiment: 'Neutral', trend: 'flat',
keyPoints: [
'Blackstone AUM hits a record $1.35T on AI-infrastructure inflows',
"Fitch's U.S. private-credit default rate hits a record 6.0% in Q2 2026",
'KKR AUM grows 16% YoY to $796B, with $143B of dry powder',
'BDC dividend coverage narrows as non-accruals rise',
],
outlook: 'Mega-managers keep raising record capital, but credit quality at smaller BDCs is deteriorating.',
riskFactors: ['Rising default rates', 'Credit cycle', 'Rate volatility'],
opportunities: ['Direct-lending scale', 'AI-infrastructure financing', 'Distressed opportunities'],
},
instruments: privateCreditData,
},
];

const colorMap: Record<string, { bg: string; border: string; text: string; solid: string; ring: string }> = {
blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/20', text: 'text-blue-400', solid: 'bg-blue-500', ring: 'border-blue-500/50' },
amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/20', text: 'text-amber-400', solid: 'bg-amber-500', ring: 'border-amber-500/50' },
purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/20', text: 'text-purple-400', solid: 'bg-purple-500', ring: 'border-purple-500/50' },
slate: { bg: 'bg-slate-400/20', border: 'border-slate-400/20', text: 'text-slate-300', solid: 'bg-slate-400', ring: 'border-slate-400/50' },
emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/20', text: 'text-emerald-400', solid: 'bg-emerald-500', ring: 'border-emerald-500/50' },
};

const getRecommendationColor = (rec: Recommendation) => {
switch (rec) {
case 'STRONG BUY': return 'bg-emerald-500';
case 'BUY': return 'bg-green-500';
case 'HOLD': return 'bg-yellow-500';
case 'SELL': return 'bg-red-500';
default: return 'bg-gray-500';
}
};

const sentimentColor = (s: SectorAnalysis['sentiment']) => {
switch (s) {
case 'Bullish': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
case 'Neutral': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
case 'Cautious': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
case 'Bearish': return 'bg-red-500/20 text-red-400 border-red-500/30';
default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}
};

function isFutures(i: Instrument): i is FuturesInstrument {
return i.type === 'Futures';
}
function isEtf(i: Instrument): i is EtfInstrument {
return i.type === 'ETF';
}
function isBdc(i: Instrument): i is BdcInstrument {
return 'aum' in i;
}
function isStock(i: Instrument): i is StockInstrument {
return i.type === 'Stock' && !isBdc(i);
}

function App() {
const [activeSectorId, setActiveSectorId] = useState<string>('shipping');
const [selectedSymbol, setSelectedSymbol] = useState<string>('ZIM');

const sector = sectors.find((s) => s.id === activeSectorId)!;
const colors = colorMap[sector.color];
const symbols = Object.keys(sector.instruments);
const instrument = sector.instruments[selectedSymbol] ?? sector.instruments[symbols[0]];

const handleSectorChange = (id: string) => {
const nextSector = sectors.find((s) => s.id === id)!;
setActiveSectorId(id);
setSelectedSymbol(Object.keys(nextSector.instruments)[0]);
};

return (
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
{/* Header */}
<header className="border-b border-white/10 backdrop-blur-sm bg-slate-900/60 sticky top-0 z-10">
<div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
<div className="flex items-center gap-3">
<div className={`w-10 h-10 rounded-xl ${colors.solid} flex items-center justify-center transition-colors`}>
<Zap className="w-6 h-6 text-white" />
</div>
<div>
<h1 className="text-xl font-bold text-white">Siri Finance Picks</h1>
<p className="text-xs text-slate-400">Graham &middot; Buffett &middot; Lynch &middot; Damodaran &middot; Greenblatt &middot; Marks</p>
</div>
</div>
<div className="flex items-center gap-2">
<button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-white/10 text-slate-300 text-sm hover:bg-slate-700/60 transition-colors">
<BookOpen className="w-3.5 h-3.5" /> Models
</button>
<button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-white/10 text-slate-300 text-sm hover:bg-slate-700/60 transition-colors">
<Sigma className="w-3.5 h-3.5" /> Math
</button>
<div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
<span className="text-green-400 text-sm flex items-center gap-1">
<span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
Live Data
</span>
</div>
<button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/70 border border-white/10 text-slate-300 hover:bg-slate-700/60 transition-colors">
<MessageCircle className="w-4 h-4" />
</button>
</div>
</div>

{/* Sector Tabs */}
<div className="max-w-7xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
{sectors.map((s) => {
const c = colorMap[s.color];
const isActive = s.id === activeSectorId;
const Icon = s.icon;
return (
<button
key={s.id}
onClick={() => handleSectorChange(s.id)}
className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
isActive ? `${c.solid} text-white` : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-white/10'
}`}
>
<Icon className="w-4 h-4" />
{s.label}
</button>
);
})}
</div>
</header>

<main className="max-w-7xl mx-auto px-4 py-6">
{/* Sector Analysis */}
<section className={`mb-6 bg-slate-800/50 backdrop-blur-sm border ${colors.border} rounded-xl p-6`}>
<div className="flex items-center justify-between flex-wrap gap-2 mb-4">
<h2 className="text-lg font-semibold text-white flex items-center gap-2">
<Activity className={`w-5 h-5 ${colors.text}`} />
Sector Analysis
</h2>
<span className={`px-3 py-1 rounded-full text-xs font-semibold border ${sentimentColor(sector.analysis.sentiment)}`}>
{sector.analysis.sentiment}
</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="md:col-span-2 space-y-2">
{sector.analysis.keyPoints.map((point, idx) => (
<div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
<CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${colors.text}`} />
<span>{point}</span>
</div>
))}
<p className="text-sm text-slate-400 pt-2">
<span className="text-slate-200 font-medium">Outlook: </span>
{sector.analysis.outlook}
</p>
</div>
<div className="space-y-4">
<div>
<h4 className="text-red-400 text-xs font-semibold flex items-center gap-1 mb-1.5">
<AlertTriangle className="w-3.5 h-3.5" /> Risks
</h4>
<ul className="text-xs text-slate-400 space-y-1">
{sector.analysis.riskFactors.map((r, idx) => <li key={idx}>&bull; {r}</li>)}
</ul>
</div>
<div>
<h4 className="text-emerald-400 text-xs font-semibold flex items-center gap-1 mb-1.5">
<ArrowUpRight className="w-3.5 h-3.5" /> Opportunities
</h4>
<ul className="text-xs text-slate-400 space-y-1">
{sector.analysis.opportunities.map((o, idx) => <li key={idx}>&bull; {o}</li>)}
</ul>

</div>
</div>
</div>
</section>

{/* Ticker Selector */}
<section className="mb-6">
<div className="flex gap-2 overflow-x-auto pb-2">
{symbols.map((sym) => {
const inst = sector.instruments[sym];
const isSelected = selectedSymbol === sym;
return (
<button
key={sym}
onClick={() => setSelectedSymbol(sym)}
className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
isSelected ? `${colors.solid} text-white` : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-white/10'
}`}
>
<span className="font-semibold">{inst.symbol}</span>
<span className={`text-sm ${inst.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
{inst.change >= 0 ? '+' : ''}{inst.changePercent.toFixed(2)}%
</span>
</button>
);
})}
</div>
</section>

{/* Main Dashboard */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
{/* Chart */}
<div className={`lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border ${colors.border} rounded-xl p-6`}>
<div className="flex items-center justify-between mb-6 flex-wrap gap-2">
<div>
<h3 className="text-2xl font-bold text-white">{instrument.symbol}</h3>
<p className="text-slate-400">{instrument.name}</p>
{instrument.note && (
<p className="text-xs text-slate-500 mt-1 max-w-md">{instrument.note}</p>
)}
</div>
<div className="text-right">
<p className="text-3xl font-bold text-white">
{isFutures(instrument) ? instrument.unit.split('/')[0] : '$'}
{instrument.currentPrice.toFixed(2)}
{isFutures(instrument) ? `/${instrument.unit.split('/')[1]}` : ''}
</p>
<p className={`flex items-center gap-1 justify-end ${instrument.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
{instrument.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
{instrument.change >= 0 ? '+' : ''}{instrument.change.toFixed(2)} ({instrument.changePercent.toFixed(2)}%)
</p>
</div>
</div>

<div className="h-64">
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={instrument.prices}>
<defs>
<linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor={`var(--tw-${sector.color}-500, #a855f7)`} stopOpacity={0.35} />
<stop offset="95%" stopColor={`var(--tw-${sector.color}-500, #a855f7)`} stopOpacity={0} />
</linearGradient>
</defs>
<CartesianGrid strokeDasharray="3 3" stroke="#334155" />
<XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
<YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
<Tooltip
contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}
/>
<Area type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorClose)" />
</AreaChart>
</ResponsiveContainer>
</div>

{isFutures(instrument) && (
<div className="mt-4 pt-4 border-t border-white/10">
<h4 className="text-slate-400 text-sm mb-2">Forward Curve</h4>
<div className="flex gap-6">
{instrument.forwardCurve.map((f) => (
<div key={f.month}>

<p className="text-xs text-slate-500">{f.month}</p>
<p className="text-white font-semibold">${f.price.toFixed(2)}</p>
</div>
))}
</div>
</div>
)}
</div>

{/* Stats */}
<div className="space-y-4">
<div className={`bg-slate-800/50 backdrop-blur-sm border ${colors.border} rounded-xl p-4`}>
<h4 className="text-slate-400 text-sm mb-3 flex items-center gap-2">
<Activity className="w-4 h-4" /> Key Metrics
</h4>
<div className="space-y-3">
{isStock(instrument) && (
<>
<div className="flex justify-between"><span className="text-slate-400">Market Cap</span><span className="text-white font-semibold">{instrument.marketCap}</span></div>
<div className="flex justify-between"><span className="text-slate-400">P/E Ratio</span><span className="text-white font-semibold">{instrument.peRatio.toFixed(2)}</span></div>
{instrument.dividendYield !== undefined && (
<div className="flex justify-between"><span className="text-slate-400">Dividend Yield</span><span className="text-white font-semibold">{instrument.dividendYield.toFixed(2)}%</span></div>
)}
{instrument.aiGrowthScore !== undefined && (
<div className="flex justify-between"><span className="text-slate-400">AI Growth Score</span><span className="text-purple-300 font-semibold">{instrument.aiGrowthScore}/100</span></div>
)}
{instrument.capexGrowth !== undefined && (
<div className="flex justify-between"><span className="text-slate-400">Capex Growth</span><span className="text-white font-semibold">+{instrument.capexGrowth.toFixed(1)}%</span></div>
)}
{instrument.fiftyTwoWeekHigh !== undefined && (
<div className="flex justify-between"><span className="text-slate-400">52W High</span><span className="text-green-400 font-semibold">${instrument.fiftyTwoWeekHigh.toFixed(2)}</span></div>
)}
{instrument.fiftyTwoWeekLow !== undefined && (
<div className="flex justify-between"><span className="text-slate-400">52W Low</span><span className="text-red-400 font-semibold">${instrument.fiftyTwoWeekLow.toFixed(2)}</span></div>
)}
</>
)}
{isEtf(instrument) && (
<>
<div className="flex justify-between"><span className="text-slate-400">Net Assets</span><span className="text-white font-semibold">{instrument.marketCap}</span></div>
{instrument.expenseRatio !== undefined && (
<div className="flex justify-between"><span className="text-slate-400">Expense Ratio</span><span className="text-white font-semibold">{instrument.expenseRatio.toFixed(2)}%</span></div>
)}
{instrument.dividendYield !== undefined && (
<div className="flex justify-between"><span className="text-slate-400">Dividend Yield</span><span className="text-white font-semibold">{instrument.dividendYield.toFixed(2)}%</span></div>

)}
</>
)}
{isFutures(instrument) && (
<>
<div className="flex justify-between"><span className="text-slate-400">Unit</span><span className="text-white font-semibold">{instrument.unit}</span></div>
<div className="flex justify-between"><span className="text-slate-400">Dec Contango</span><span className="text-white font-semibold">
{(((instrument.forwardCurve[2].price / instrument.forwardCurve[0].price) - 1) * 100).toFixed(1)}%
</span></div>
</>
)}
{isBdc(instrument) && (
<>
<div className="flex justify-between"><span className="text-slate-400">AUM</span><span className="text-white font-semibold">{instrument.aum}</span></div>
<div className="flex justify-between"><span className="text-slate-400">Yield</span><span className="text-white font-semibold">{instrument.yield.toFixed(2)}%</span></div>
<div className="flex justify-between"><span className="text-slate-400">Credit Spread</span><span className="text-white font-semibold">{instrument.creditSpread} bps</span></div>
</>
)}
</div>
</div>

<div className={`bg-slate-800/50 backdrop-blur-sm border ${colors.border} rounded-xl p-4`}>
<h4 className="text-slate-400 text-sm mb-3 flex items-center gap-2">
<BarChart3 className="w-4 h-4" /> AI Recommendation
</h4>
<div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold text-white ${getRecommendationColor(instrument.recommendation)}`}>
{instrument.recommendation}
</div>
<p className="text-slate-300 text-sm mt-3">
{instrument.recommendation === 'STRONG BUY' && 'Strong fundamentals with significant upside potential. Consider accumulating.'}
{instrument.recommendation === 'BUY' && 'Positive outlook with good growth prospects. Suitable for long-term investors.'}
{instrument.recommendation === 'HOLD' && 'Fair valuation at current levels. Maintain existing positions.'}
{instrument.recommendation === 'SELL' && 'Consider reducing exposure due to headwinds.'}
</p>
</div>

{isStock(instrument) && instrument.fiftyTwoWeekHigh !== undefined && instrument.fiftyTwoWeekLow !== undefined && (
<div className={`bg-gradient-to-br ${colors.bg} to-transparent backdrop-blur-sm border ${colors.border} rounded-xl p-4`}>
<h4 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
<DollarSign className={`w-4 h-4 ${colors.text}`} /> Price Range Position
</h4>
<div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
<div className="absolute inset-0 flex">
<div className="w-1/3 bg-red-500/30" />
<div className="w-1/3 bg-yellow-500/30" />
<div className="w-1/3 bg-green-500/30" />
</div>
<div
className="absolute w-3 h-3 bg-white rounded-full shadow-lg transform -translate-x-1/2"
style={{
left: `${((instrument.currentPrice - instrument.fiftyTwoWeekLow) / (instrument.fiftyTwoWeekHigh - instrument.fiftyTwoWeekLow)) * 100}%`,
}}
/>
</div>
<div className="flex justify-between mt-2 text-xs text-slate-400">
<span>${instrument.fiftyTwoWeekLow.toFixed(0)}</span>
<span className={`${colors.text} font-semibold`}>${instrument.currentPrice.toFixed(2)}</span>
<span>${instrument.fiftyTwoWeekHigh.toFixed(0)}</span>
</div>
</div>
)}
</div>
</div>

{/* Sector Overview Table */}
<section className="mt-8">
<h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
<BarChart3 className={`w-5 h-5 ${colors.text}`} />
{sector.label} Overview
</h2>
<div className={`bg-slate-800/50 backdrop-blur-sm border ${colors.border} rounded-xl overflow-hidden overflow-x-auto`}>
<table className="w-full">
<thead>
<tr className="border-b border-white/10">
<th className="text-left py-3 px-4 text-slate-400 font-medium">Symbol</th>
<th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
<th className="text-right py-3 px-4 text-slate-400 font-medium">Price</th>
<th className="text-right py-3 px-4 text-slate-400 font-medium">Change</th>
<th className="text-right py-3 px-4 text-slate-400 font-medium">Size</th>
<th className="text-center py-3 px-4 text-slate-400 font-medium">Rating</th>
</tr>
</thead>
<tbody>
{symbols.map((sym) => {
const inst = sector.instruments[sym];
const sizeLabel = isStock(inst) ? inst.marketCap : isEtf(inst) ? inst.marketCap : isBdc(inst) ? inst.aum : '—';
return (
<tr
key={sym}
onClick={() => setSelectedSymbol(sym)}
className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
>
<td className="py-3 px-4 text-white font-semibold">{inst.symbol}</td>
<td className="py-3 px-4 text-slate-300">{inst.name}</td>
<td className="py-3 px-4 text-right text-white">${inst.currentPrice.toFixed(2)}</td>
<td className={`py-3 px-4 text-right ${inst.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
{inst.change >= 0 ? '+' : ''}{inst.changePercent.toFixed(2)}%
</td>
<td className="py-3 px-4 text-right text-slate-300">{sizeLabel}</td>
<td className="py-3 px-4 text-center">
<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white ${getRecommendationColor(inst.recommendation)}`}>
{inst.recommendation}
</span>
</td>
</tr>
);
})}
</tbody>
</table>
</div>
</section>
</main>

{/* Footer */}
<footer className="border-t border-white/10 mt-12">
<div className="max-w-7xl mx-auto px-4 py-6 text-center">
<p className="text-slate-400 text-sm">Powered by AI | Data refreshed: August 13, 2026 (U.S. market close)</p>
<p className="text-slate-500 text-xs mt-1">
Disclaimer: This is for informational purposes only. Not financial advice.
</p>
</div>
</footer>
</div>
);
}

export default App;
