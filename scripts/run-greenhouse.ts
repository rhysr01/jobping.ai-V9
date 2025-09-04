import { scrapeGreenhouseBoard } from "../scrapers/greenhouse";

const boards = [
  // 🎯 HIGH-QUALITY EUROPEAN GRADUATE PROGRAMS (Verified)
  "flowtraders",           // Graduate Trader (Amsterdam) / Trading Intern
  "squarepointcapital",    // Graduate Software Developer (London/Paris/Warsaw)
  "jumptrading",           // Campus Software Engineer (Intern) — London
  "twiliostudents",        // Software Engineering Graduate — Dublin
  "pinterest",             // Software Engineering Intern 2026 — Dublin
  "stepstone",             // 2026 Private Debt Intern — Dublin
  "charlesriverassociates", // Intern (European Competition) — Brussels/Munich
  "optiverus",             // 2026 EU Graduate & Intern — Amsterdam
  "imc",                   // Graduate Java Software Engineer — Amsterdam
  "guerrilla-games",       // Technical Design Intern — Amsterdam
  "ridedott",              // Workshop & Engineering Intern — Amsterdam
  "bluecrestcapitalmanagement", // Product Controller (Recent Graduate) — London
  "yougov",                // Company Secretarial Graduate — London
  
  // ✅ Previously Working Boards
  "monzo",                 // UK early-career (seasonal)
  "sumup",                 // Berlin/London junior & intern roles
  "adyen",                 // Dutch graduate programs
  "n26",                   // German graduate programs
  "getyourguide",          // German graduate programs
  "hellofresh",            // German graduate programs
  "coinbase",              // European graduate programs
  "asana",                 // European graduate programs
  "figma",                 // European graduate programs
  "gitlab",                // European graduate programs
  "hashicorp",             // European graduate programs
  "vercel",                // European graduate programs
  "anthropic",             // European graduate programs
  "stripe",                // European graduate programs
  "airbnb",                // European graduate programs
  "robinhood",             // European graduate programs
  "dropbox",               // European graduate programs
  "clickup",               // European graduate programs
  "webflow",               // European graduate programs
  "airtable",              // European graduate programs
  "calendly",              // European graduate programs
  "brex",                  // European graduate programs
  "retool"                 // European graduate programs
];

(async () => {
  let total = 0;
  for (const b of boards) {
    try {
      const rows = await scrapeGreenhouseBoard(b, { company: b, euOnly: true, earlyOnly: true });
      console.log(`• ${b}: ${rows.length} early-career EU jobs`);
      // TODO: upsert to DB here
      total += rows.length;
      await new Promise(r => setTimeout(r, 400)); // polite throttle
    } catch (e) {
      console.error(`x ${b}:`, (e as Error).message);
    }
  }
  console.log(`\nTotal collected: ${total}`);
})();
