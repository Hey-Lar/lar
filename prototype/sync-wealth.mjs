/* Lar ← net-worth.md sync. Run: node sync-wealth.mjs
   Reads the single source of truth (net-worth/data.js), computes the derived
   figures exactly as net worth.md does, and regenerates the Wealth section of
   index.html between its WEALTH/HEALTH comment markers — plus the home tile.
   Idempotent: same data in, byte-identical page out. */
import { readFileSync, writeFileSync } from "node:fs";

const DATA = "/Users/jones/Documents/Claude/net-worth/data.js";
const PAGE = "index.html";

/* load NW_DATA without a browser */
const w = {};
new Function("window", readFileSync(DATA, "utf8"))(w);
const D = w.NW_DATA;
if (!D) { console.error("NW_DATA not found in", DATA); process.exit(1); }

const { revolut, portfolio, card, pension } = D.accounts;
const E = D.equity;
const vest    = E.vestedShares   * E.price / E.fx;
const unvest  = E.unvestedShares * E.price / E.fx;
const liquid  = revolut + portfolio + vest + card;
const total   = liquid + pension + unvest;
const conc    = Math.round((vest + unvest) / total * 100);
const [tSave, tInv, tUsdc] = D.targets;           // [label, current, target]
const gap     = tSave[2] - tSave[1];
const pct     = t => Math.round(t[1] / t[2] * 100);
const eur     = n => "€" + Math.round(n).toLocaleString("en-IE");
const neg     = n => "−€" + Math.abs(Math.round(n)).toLocaleString("en-IE");
const asOf    = D.meta.asOf;

/* account rows, ranked by size; fills relative to the largest line */
const rows = [
  { name: "Unvested equity",  sub: `${E.unvestedShares} sh · not sellable`, v: unvest, cls: "", fill: "pale-f",
    info: `EQUITY|Unvested — ${eur(unvest)}|${E.unvestedShares} ${E.ticker} shares at $${E.price.toFixed(2)}, not sellable yet. The reason concentration reads ${conc}% — vesting and selling down is the standard fix.` },
  { name: "Portfolio",        sub: `${D.holdings.length} ETFs · brokerage`, v: portfolio, cls: " full", fill: "",
    info: `ACCOUNT|Portfolio — ${eur(portfolio)}|${D.holdings.length} ETFs on the brokerage: S&amp;P 500 core, regional sleeves, a thematic tail. ${eur(tInv[2])} target — ${pct(tInv)}% there.` },
  { name: "Irish Life PRSA",  sub: "pension · statement-only", v: pension, cls: "", fill: "",
    info: `ACCOUNT|Irish Life PRSA — ${eur(pension)}|Tied to Irish employment ending 30 nov. Open question for the 7 sep advisor call: preserve or transfer before the move.` },
  { name: "Revolut",          sub: `liquid · savings target ${eur(tSave[2])}`, v: revolut, cls: "", fill: "",
    info: `ACCOUNT|Revolut — ${eur(revolut)}|Main liquid account. Savings target ${eur(tSave[2])} — the gap is ${eur(gap)}, coverable by two salary cycles plus the vested sale before 01 oct.` },
  { name: "E*Trade vested",   sub: `${Math.round(E.vestedShares)} sh · sellable today`, v: vest, cls: "", fill: "",
    info: `EQUITY|E*Trade vested — ${eur(vest)}|${Math.round(E.vestedShares)} ${E.ticker} shares sellable today. Earmarked to close the savings gap before the 01 oct treasury deadline.` },
  { name: "Credit card",      sub: "only negative line", v: card, cls: "", fill: "neg-f",
    info: `DEBT|Credit card — ${neg(card)}|The only negative line on the sheet. Clearing it is the cheapest gain available — no market risk, guaranteed return.` },
];
const max = Math.max(...rows.map(r => Math.abs(r.v)));
const meter = r => `            <div class="meter${r.cls}" role="button" tabindex="0" data-fill="${Math.max(2, Math.round(Math.abs(r.v) / max * 100))}" data-info="${r.info}"><div class="name">${r.name}<small>${r.sub}</small></div><div class="trk"><span class="fill ${r.fill}"></span></div><div class="val">${r.v < 0 ? neg(r.v) : eur(r.v)}</div></div>`;

const section = `      <section class="view" id="v-we" aria-label="Wealth">
        <div class="paper">
          <div class="paper-top">
            <a class="crumb" href="https://claude.ai/code/artifact/fbb9aeb2-ebc8-494a-a492-36628dc557b2" style="text-decoration:none;color:inherit"><span class="dot">W</span>Net worth<small>read-only · net-worth.md · ${asOf} · open full board</small></a>
            <span class="board-title"><b>Wealth</b> · liquid + pension + unvested equity</span>
          </div>
          <div class="board-grid">
            <div class="goal" role="button" tabindex="0" data-info="NET WORTH|${eur(total)} · all tiers|Liquid ${eur(liquid)} + pension ${eur(pension)} + unvested equity ${eur(unvest)}. Sourced read-only from net-worth.md (data.js, snapshot ${asOf}). Lar can see money; it can never move it.">
              <div class="k">Total · all tiers</div>
              <div class="g">${eur(total)}</div>
              <div class="row"><span class="meta">liquid ${eur(liquid)}</span><span class="badge-lime">${conc}% ${E.ticker} STOCK</span></div>
              <div class="row"><span class="meta">Move fund · Letterkenny → Mijas · dec 2026</span></div>
            </div>
            <div class="workcard">
              <div class="wk-head"><h3>Accounts</h3><span>${rows.length} lines · net-worth.md</span></div>
${rows.map(meter).join("\n")}
            </div>
          </div>
          <div class="stickies" style="margin-top:16px">
            <div class="sticky" role="button" tabindex="0" data-info="TARGET|${tSave[0]} — ${pct(tSave)}%|${eur(tSave[1])} of ${eur(tSave[2])} counted toward the move fund. Two salary cycles + the vested sale clears the ${eur(gap)} gap comfortably."><b>${pct(tSave)}%</b><span class="lbl">Savings · ${eur(tSave[2])}</span><span class="note">gap ${eur(gap)} · due 01 oct</span></div>
            <div class="sticky" role="button" tabindex="0" data-info="TARGET|${tInv[0]} — ${pct(tInv)}%|${eur(tInv[1])} of ${eur(tInv[2])}. On pace; platform (Lightyear vs Trading212) still to confirm — it decides which treasury target this counts toward."><b>${pct(tInv)}%</b><span class="lbl">Invested · ${eur(tInv[2])}</span><span class="note">platform TBC</span></div>
            <div class="sticky dark" role="button" tabindex="0" data-info="RULE|No remittances to Irish accounts|Until dec 2029, and ≤30 days in Ireland in 2027. Whether the Revolut Irish IBAN counts is the question for the 7 sep tax consult."><b>Dec 2029</b><span class="lbl">Remittance rule</span><span class="note">Irish accounts · advisor 07 sep</span></div>
            <div class="sticky" role="button" tabindex="0" data-info="TARGET|${tUsdc[0]} — ${pct(tUsdc)}%|${eur(tUsdc[1])} of ${eur(tUsdc[2])} target, crypto capped at €5–10k overall. Deliberately last: it waits until the savings gap is closed."><b>${pct(tUsdc)}%</b><span class="lbl">USDC · ${eur(tUsdc[2])}</span><span class="note">opens after 01 oct</span></div>
          </div>
        </div>
      </section>`;

let page = readFileSync(PAGE, "utf8");
const re = /(      <!-- ── WEALTH ─+ -->\n)[\s\S]*?(\n      <!-- ── HEALTH)/;
if (!re.test(page)) { console.error("WEALTH markers not found"); process.exit(1); }
page = page.replace(re, `$1${section}$2`);

/* home tile */
page = page.replace(/(id="nw-tile-v">)[^<]*(<)/, `$1${eur(total)}$2`);
page = page.replace(/(id="nw-tile" data-info="NET WORTH\|)[^|]*(\|)/, `$1${eur(total)} · all tiers$2`);

writeFileSync(PAGE, page);
console.log(`synced: total ${eur(total)} · liquid ${eur(liquid)} · conc ${conc}% · as of ${asOf}`);
