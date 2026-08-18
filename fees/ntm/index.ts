import { CHAIN } from "../../helpers/chains";
import { FetchOptions } from "../../adapters/types";
import { httpGet } from "../../utils/fetchURL";

const endpoint = "https://api.ntm.ai/feesAndRevenues.php?";
const chainToken: Record<string, string> = {
  [CHAIN.TON]: "the-open-network",
  [CHAIN.AVAX]: "avalanche-2",
  [CHAIN.BSC]: "binancecoin",
  [CHAIN.ETHEREUM]: "ethereum",
  [CHAIN.TRON]: "tron",
  [CHAIN.SOLANA]: "solana",
};


// TEMPORARY EGRESS PROBE - not for merge
const probeEgress = async () => {
  const u = `${endpoint}start_date=2026-08-16T00:00:00&end_date=2026-08-17T00:00:00&chain=solana`;
  const variants: Array<[string, Record<string, string>]> = [
    ["bare", {}],
    ["ua-only", { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" }],
    ["browser-full", {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
    }],
    ["referer", {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Referer": "https://ntm.ai/",
      "Origin": "https://ntm.ai",
    }],
  ];
  try {
    const ip = await (await fetch("https://api.ipify.org?format=json")).json();
    console.log("PROBE egress ip:", JSON.stringify(ip));
  } catch (e: any) { console.log("PROBE egress ip: failed", e?.message); }
  for (const [name, headers] of variants) {
    try {
      const r = await fetch(u, { headers });
      const body = (await r.text()).slice(0, 120).replace(/\s+/g, " ");
      console.log(`PROBE ${name}: status=${r.status} cf-ray=${r.headers.get("cf-ray")} body=${body}`);
    } catch (e: any) {
      console.log(`PROBE ${name}: threw ${e?.message}`);
    }
  }
};

const fetchFeesAndRevenues = async (options: FetchOptions) => {
  const startTime = new Date(options.startTimestamp * 1000)
    .toISOString()
    .split(".")[0];
  const endTime = new Date(options.endTimestamp * 1000)
    .toISOString()
    .split(".")[0];
  await probeEgress();
  const res = await httpGet(
    `${endpoint}start_date=${startTime}&end_date=${endTime}&chain=${options.chain}`,
  );
  const token = chainToken[options.chain];
  const dailyFees = options.createBalances();
  const dailyRevenue = options.createBalances();
  dailyFees.addCGToken(token, res.fees_total);
  dailyRevenue.addCGToken(token, res.revenue_total);

  return { dailyFees, dailyRevenue };
};

const adapter: any = {
  version: 2,
  methodology: {
    Fees: "Sums the fees of listing request & trending request.",
    Revenue: "Sums the fees of listing request & trending request.",
  },
  fetch: fetchFeesAndRevenues,
  start: "2023-05-22",
  chains: [
    CHAIN.ETHEREUM,
    CHAIN.BSC,
    CHAIN.AVAX,
    CHAIN.SOLANA,
    CHAIN.TRON,
    CHAIN.TON,
  ],
};

export default adapter;
