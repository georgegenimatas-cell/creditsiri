const SYMBOLS = ["NVDA", "GOOGL", "XLE", "SBLK", "BX"];

interface FinnhubQuote {
c: number;
d: number;
dp: number;
h: number;
l: number;
o: number;
pc: number;
t: number;
}

export default async function handler(req: any, res: any) {
const apiKey = process.env.FINNHUB_API_KEY;

if (!apiKey) {
res.status(500).json({
error: "Missing FINNHUB_API_KEY environment variable. Add it in your Vercel project settings.",
});
return;
}

try {
const quotes = await Promise.all(
SYMBOLS.map(async (symbol) => {
const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;

const response = await fetch(url);

if (!response.ok) {
throw new Error(`Finnhub request for ${symbol} failed with status ${response.status}`);
}

const data: FinnhubQuote = await response.json();

return {
symbol,
price: data.c,
change: data.d,
changePercent: data.dp,
previousClose: data.pc,
high: data.h,
low: data.l,
};
})
);

res.setHeader("Cache-Control", "s-maxage=270, stale-while-revalidate=60");

res.status(200).json({
quotes,
updatedAt: new Date().toISOString(),
});
} catch (error: any) {
res.status(502).json({
error: "Failed to fetch live quotes",
detail: String(error?.message ?? error),
});
}
}
