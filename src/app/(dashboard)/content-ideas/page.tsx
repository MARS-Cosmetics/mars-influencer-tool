"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";

// ============================================================
// Content. All editable inline — Hinglish, English, mixed.
// ============================================================

// Pinned: this is always the FIRST quote shown on page load.
const INITIAL_QUOTE = "Upgrade your intern, he'll upgrade your app.";

const QUOTES: string[] = [
  // -- Reels / Content production --
  "Trending audio find karna ek full-time job hai. Salary nahi.",
  "Reel ka trend kal popular tha. Aaj nahi. Repeat after me: I am too late.",
  "9 reels shoot kiye. Caption pe atke 2 ghante.",
  "Reel reshoot karna padega. Lighting was 'aspirational' but not 'aspirational enough'.",
  "Today's reel theme: 'effortless glam'. Reality: 4 hours of prep.",
  "Carousel ya reel? PM decided. Then changed mind. Then said 'just do both'.",
  "Instagram trends ki life: 48 hours. Brand approval ki life: 2 weeks.",
  "Story polls: '47% want pink, 53% want red'. Boss: 'launch orange'.",
  "Caption draft: 22 revisions. Final caption: 'New shade, who dis 💋'. Same as draft 1.",
  "Lighting setup: 3 hours. Shoot: 30 minutes. Edit: 4 hours. Reel duration: 9 seconds.",
  "MUA bole 'this lipstick won't work in studio lighting'. We posted it anyway.",
  "Reel got 50K views, 12 saves, 0 sales. We're calling it a 'brand awareness win'.",

  // -- Influencer chaos --
  "Influencer ne PR box mila but post nahi kiya. Classic.",
  "20 influencers ko outreach kiya. 3 replied. 1 asked for ₹50K. 2 ghosted.",
  "Influencer bola 'I love the brand'. Then asked for cash + product + flight.",
  "Barter collab pitch: 'great exposure'. Influencer pitch back: 'mujhe paisa do'.",
  "Negotiating with influencer agencies is like dating: confusing, expensive, ghosted.",
  "Influencer collab going well? Wait for the contract issues.",
  "Influencer rate card dekha. Marketing team ne paani manga liya.",
  "Influencer 'unboxing' video shoot kiya. Box ka box, content nahi.",
  "Influencer strategy: send free product. Hope. Pray. Repeat.",
  "Influencer ne kaha 'I only work with brands I love'. Then asked for ₹2L per reel.",
  "Influencer ki audience: 'Tier 1 metro, premium spenders'. Reality: bots from elsewhere.",
  "Influencer bole 'I'm an artist'. Translation: '₹1L se kam nahi'.",
  "Founder's friend's daughter has 12K followers. Guess who got the brand deal?",

  // -- Campaign / Launch drama --
  "Diwali campaign brief: 'something festive but not too festive'.",
  "Karwa Chauth campaign: empower karo, romance karo, lipstick bech do. Sab ek hi reel mein.",
  "Product launch hai kal. Mood board abhi finalize hua hai. Sab theek hai.",
  "Campaign budget: ₹2L. Campaign output: 1 reel, 3 stories, 47 internal revisions.",
  "New shade launch: 17 swatches photographed, 2 selected, 1 changed at the last minute.",
  "Today's product launch: same lipstick, new packaging, 30% premium.",
  "Diwali sale. Holi sale. Valentine sale. 'Tuesday' sale. We don't discriminate.",
  "Photoshoot postponed for 3rd time. Influencer rescheduled. Founder is travelling. Just us and the props.",
  "Photoshoot at 7 AM. Model came at 9. Director came at 10. Founder came at 11 with 'changes'.",
  "Studio costs ₹40K/day. Final reel uses 9 seconds of footage. Math is not mathing.",
  "Brief: 5 pages. Output: 1 reel. Revisions: 14. Sleep: 0.",
  "Approved by 12 people. Executed by 1. Blame distributed to 0.",

  // -- Brand / Founder drama --
  "Founder bole 'this should feel premium but accessible'. Marketing team: blank stare.",
  "Hex code matlab #A6192E. Founder bole 'it's looking pink'. Marketing: 'sir, monitor calibration?'",
  "Brand voice: bold, premium, aspirational. Caption draft: 'omg slay queen'. Tension exists.",
  "Logo placement debate: 14 days. Outcome: same as before.",
  "Founder pe email gaya. Reply: '???'. Translation: redo everything.",
  "Brand book: 'bold, premium, aspirational'. PM: 'just make it pop'.",
  "Founder approved campaign at 11 PM. Changed mind at 7 AM. Standard.",
  "Founder ne approve kiya. Senior ne reject kiya. Founder ne phir approve kiya. Time of death: deadline.",
  "'Founder ka favorite shade hai' is not a strategy, but here we are.",
  "Founder's idea: 'let's do something disruptive'. Translation: 'copy what worked last quarter'.",
  "Senior took credit for the reel that did 2M views. Person who made it: 'cool'.",

  // -- WhatsApp / Asana team chaos --
  "WhatsApp group 'Mars Marketing': 200 messages a day, 0 decisions made.",
  "Asana mein 23 task hai. Brain mein 0 idea hai.",
  "WhatsApp group: 'Mars Marketing'. Last message: '?'.",
  "Asana ka deadline aaya. Marketing ne soba billa banke ignore kiya.",
  "Asana task assigned at 6 PM. Due time: 'ASAP'. Translation: 'don't sleep'.",
  "PM on WhatsApp: 'aap kahan ho?'. Marketing: 'sir, content idea dhundh rahe hai'.",
  "Sunday 11:30 PM WhatsApp ping. Manager: 'just a quick thought'. Quick thought = 4 ghante ka kaam.",
  "Manager on vacation. WhatsApp at 7 AM: 'just one quick thing'.",

  // -- Manager / PM roast --
  "Manager's feedback: 'make it pop'. Marketing's interpretation: 'cry harder'.",
  "Sir bole 'just one small change'. Wo small change 4 ghante le gaya.",
  "PM: 'we need engagement'. Marketing: 'sir, mujhe engagement chahiye — ghar walon ke liye'.",
  "Stand-up: 45 minute existential crisis disguised as a 'quick sync'.",
  "Senior: 'think outside the box'. Junior: 'sir, mera box hi nahi hai'.",
  "Annual review: 'shows promise'. Translation: 'we don't want to give a raise'.",

  // -- Beauty / cosmetics specific --
  "Lipstick marketing rule #1: just say 'bold' a lot.",
  "Cosmetics ka golden rule: jab samajh nahi aata, gold use kar lo.",
  "Empower karne ke liye, ek aur eyeliner launch ho gaya.",
  "Lipstick ka shade alag, naam alag, formula? Bhul jao.",
  "Mascara reel shoot. Influencer ke pass mascara nahi. Bhejna padega. Trend tab tak gone.",
  "Aesthetic: 'modern Indian woman'. Reality: stock photo of a woman drinking tea.",
  "Compact powder ke andar content idea dhundh raha hu. Nahi mil raha.",
  "Lipstick swatches lagaye, content idea wahin reh gaya.",
  "Highlighter shine karta hai. Marketing team's mood doesn't.",
  "Foundation shade: 'Honey Beige'. Customer review: 'it's grey'.",

  // -- Slay / Gen-Z / caption voice --
  "Slay diva. The deck is due at 3 PM but slay anyway.",
  "It's giving... no content ideas. But also it's giving... billa.",
  "Eat. Slay. No crumbs. Just submit the brief by EOD please.",
  "Period. Hot girl content. No notes.",
  "She's a 10 but she missed the deadline.",
  "Serving looks, serving content, serving notice.",
  "Bestie, the algorithm is not your friend.",
  "Slay queen. Now do the analytics.",
  "Hot girls have no content ideas. We're hot girls.",
  "And I oop— the campaign budget.",

  // -- Marketing strategy fluff --
  "Marketing strategy: pray to the algorithm. Backup strategy: cry.",
  "Brand storytelling = same product, longer caption.",
  "Pivot karo. Phir wapis pivot karo. Phir confused ho jao. Voila — strategy.",
  "ROI stands for 'Random Office Ideas'.",
  "Today's mood board has 47 references and zero direction.",
  "We don't have a strategy. We have 'vibes' and 'a content calendar'.",
  "Campaign objective: 'create buzz'. Buzz received: zero. Buzzwords used: thirty-seven.",
  "'Going viral' is not a strategy. It's a coping mechanism.",
  "Sales team: 'why didn't marketing tell us?'. Marketing: 'humne 4 meetings mein bola'.",
  "Reach 1M. Conversions: 4. We're spinning this as 'product education'.",
  "All-hands meeting: 90 minutes, 47 slides, 1 takeaway: 'be more aligned'.",
  "Annual offsite: 3 days, 17 PowerPoints, 0 strategic decisions, 1 hangover.",
  "Founder's birthday post got more engagement than the product launch. We don't talk about it.",

  // -- Intern signature (small but visible — so you know who made this page) --
  "Intern dead 💀",
  "Intern is tired. Please feed him stipend.",
  "Intern ka khel khatam hai, bhai.",
  "Bhai mujhe break chahiye, but pehle paisa do.",
  INITIAL_QUOTE,
  "If you're reading this, the intern is still figuring it out. Please clap.",
  "Behind every great content idea is an empty database table.",

  // -- Absurd glue --
  "Trends come and go. Billa remains.",
  "Content idea nahi hai but billa toh hai.",
  "Reel kar lo, story kar lo, carousel kar lo. Bas idea mat maango.",
];

const BILLAS: { src: string; name: string; vibe: string }[] = [
  { src: "/billas/badmash_billa_with_jibbh.gif", name: "Badmash Billa", vibe: "Jibbh dikha raha hai. Disrespectful." },
  { src: "/billas/banana_billa.webp", name: "Banana Billa", vibe: "Potassium-rich content strategy." },
  { src: "/billas/bhigga_billa.gif", name: "Bhigga Billa", vibe: "Caught in the rain like the intern's career." },
  { src: "/billas/bhikari_billa.webp", name: "Bhikari Billa", vibe: "Stipend please. Or treats. Anything." },
  { src: "/billas/billa_in_a_war.gif", name: "War Billa", vibe: "When the marketing meeting goes south." },
  { src: "/billas/cute_billa_with_smile.webp", name: "Cute Billa", vibe: "Smiling because the deadline is someone else's problem." },
  { src: "/billas/cute_pi_billa.webp", name: "Pi Billa", vibe: "3.14 reasons we're not finishing the deck." },
  { src: "/billas/dil_attack_billa.webp", name: "Dil Attack Billa", vibe: "Cardiac event triggered by Slack notification." },
  { src: "/billas/love_you_billa.webp", name: "Love You Billa", vibe: "Manager said 'good work' once in 2024. Still recovering." },
  { src: "/billas/mohehe_billa.webp", name: "Mohehe Billa", vibe: "Laughing at our own brand book." },
  { src: "/billas/muaa_papa_billa.webp", name: "Muaa Billa", vibe: "When the brief finally makes sense (rare)." },
  { src: "/billas/sad_billa_with_phone.webp", name: "Sad Billa", vibe: "Scrolling LinkedIn looking for purpose." },
  { src: "/billas/sleepy_billa.gif", name: "Sleepy Billa", vibe: "POV: standup at 9 AM." },
  { src: "/billas/soba_billaaa.webp", name: "Soba Billa", vibe: "The goal. The dream. The endgame." },
  { src: "/billas/sus_billa.gif", name: "Sus Billa", vibe: "Has questions about the brand book." },
];

const VERDICTS: string[] = [
  "PROGNOSIS: needs nap.",
  "PROGNOSIS: send stipend immediately.",
  "PROGNOSIS: hopeless but adorable.",
  "PROGNOSIS: ✨ unhinged ✨ but functional.",
  "PROGNOSIS: 73% billa, 27% intern.",
  "PROGNOSIS: please touch grass.",
  "PROGNOSIS: log off. log back on. cry.",
  "PROGNOSIS: certified slay, low ROI.",
];

const QUOTE_AUTHORS: string[] = [
  "— Intern, probably crying",
  "— anonymous billa",
  "— that one PM, on WhatsApp at 11pm",
  "— marketing team, off the record",
  "— the brand book (page 47)",
  "— EOD, every day",
  "— senior with 47 unread Asana tasks",
  "— Mars marketing WhatsApp group",
];

// ============================================================
// Utilities
// ============================================================

function pickRandom<T>(arr: T[], avoid?: T): T {
  if (arr.length === 1) return arr[0];
  let pick = arr[Math.floor(Math.random() * arr.length)];
  if (avoid !== undefined && pick === avoid) {
    pick = arr[Math.floor(Math.random() * arr.length)];
  }
  return pick;
}

function pickDistinct<T>(arr: T[], n: number, exclude: T[] = []): T[] {
  const pool = arr.filter((x) => !exclude.includes(x));
  const out: T[] = [];
  const taken = new Set<number>();
  while (out.length < Math.min(n, pool.length)) {
    const i = Math.floor(Math.random() * pool.length);
    if (taken.has(i)) continue;
    taken.add(i);
    out.push(pool[i]);
  }
  return out;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStats(): { label: string; value: string; pct: number; color: string }[] {
  const stipendHope = randomInt(0, 15);
  const sobaProb = randomInt(70, 99);
  const slayMeter = randomInt(0, 100);
  const brainCells = randomInt(0, 8);
  const coffeeLevel = randomInt(0, 30);
  return [
    { label: "Stipend hope", value: `${stipendHope}%`, pct: stipendHope, color: "bg-red-400" },
    { label: "Soba probability", value: `${sobaProb}%`, pct: sobaProb, color: "bg-indigo-400" },
    { label: "Slay-o-meter", value: slayMeter > 80 ? `${slayMeter}% ✨` : `${slayMeter}%`, pct: slayMeter, color: "bg-pink-400" },
    { label: "Brain cells", value: `~${brainCells}`, pct: brainCells * 12.5, color: "bg-amber-400" },
    { label: "Coffee", value: coffeeLevel < 10 ? `${coffeeLevel}% ☕` : `${coffeeLevel}%`, pct: coffeeLevel, color: "bg-orange-400" },
  ];
}

// ============================================================
// Component
// ============================================================

type Scene = {
  hero: typeof BILLAS[number];
  quote: string;
  author: string;
  stats: ReturnType<typeof generateStats>;
  verdict: string;
  miniBillas: typeof BILLAS;
  rotations: number[];
};

function buildScene(
  hero: typeof BILLAS[number],
  quote: string,
  prev?: Scene,
): Scene {
  return {
    hero,
    quote,
    author: pickRandom(QUOTE_AUTHORS),
    stats: generateStats(),
    verdict: pickRandom(VERDICTS, prev?.verdict),
    miniBillas: pickDistinct(BILLAS, 4, [hero]),
    rotations: [
      randomInt(-3, 0),
      randomInt(0, 3),
      randomInt(-4, -1),
      randomInt(1, 4),
      randomInt(-3, 1),
      randomInt(0, 4),
    ],
  };
}

export default function ContentIdeasPlaceholderPage() {
  const [scene, setScene] = useState<Scene | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  // Pinned: first load uses INITIAL_QUOTE. After any shuffle, random.
  useEffect(() => {
    const initial = buildScene(pickRandom(BILLAS), INITIAL_QUOTE);
    sceneRef.current = initial;
    setScene(initial);
  }, []);

  function shuffleAll() {
    const prev = sceneRef.current;
    const nextHero = pickRandom(BILLAS, prev?.hero);
    const nextQuote = pickRandom(QUOTES, prev?.quote);
    const next = buildScene(nextHero, nextQuote, prev ?? undefined);
    sceneRef.current = next;
    setScene(next);
  }

  function switchToBilla(b: typeof BILLAS[number]) {
    const prev = sceneRef.current;
    if (!prev) return;
    const nextQuote = pickRandom(QUOTES, prev.quote);
    const next = buildScene(b, nextQuote, prev);
    sceneRef.current = next;
    setScene(next);
  }

  if (!scene) {
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-400">
        Summoning the billas…
      </div>
    );
  }

  const [rHero, rStats, rM1, rM2, rM3, rM4] = scene.rotations;
  const miniRots = [rM1, rM2, rM3, rM4];

  return (
    <div
      className="flex h-[calc(100vh-7rem)] flex-col gap-3 overflow-hidden rounded-2xl bg-[#fefaf3] p-4"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#A6192E] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
            <Sparkles className="h-2.5 w-2.5" />
            Intern Bulletin
          </div>
          <div>
            <h1
              className="text-xl font-bold tracking-tight text-zinc-900"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              Content Ideas (work in progress, like the intern)
            </h1>
            <p className="text-[11px] text-zinc-500">
              Click a billa below or hit &ldquo;Naye vibes&rdquo;. No scroll needed.
            </p>
            <p className="mt-0.5 text-[10px] italic text-zinc-400">
              Built by <span className="font-medium text-zinc-600">Anurag Sharma</span>{" "}
              — tech intern, for the Mars marketing team. Stipend abhi bhi nahi mila.
            </p>
          </div>
        </div>
        <Button onClick={shuffleAll} size="sm" className="gap-1.5 bg-zinc-900 hover:bg-zinc-800">
          <RefreshCw className="h-3.5 w-3.5" />
          Naye vibes
        </Button>
      </div>

      {/* Main scene — fills remaining height, no scroll */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
        {/* Hero polaroid with sticky-note quote (2/3 width) */}
        <div className="relative flex min-h-0 items-center justify-center lg:col-span-2">
          <div
            className="relative w-full max-w-md rounded-sm bg-white p-3 pb-10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)]"
            style={{ transform: `rotate(${rHero}deg)` }}
          >
            {/* Masking tape */}
            <div className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 bg-yellow-200/70 shadow-sm" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scene.hero.src}
                alt={scene.hero.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute inset-x-0 bottom-2 px-4 text-center">
              <p
                className="text-base font-semibold italic text-zinc-900"
                style={{ fontFamily: "var(--font-bricolage)" }}
              >
                {scene.hero.name}
              </p>
              <p className="text-[10px] italic text-zinc-500">{scene.hero.vibe}</p>
            </div>

            {/* Quote as sticky note — pinned to the top-right corner so it
                overlaps the image only, never the billa name/vibe at the bottom. */}
            <div
              className="absolute -right-10 -top-4 w-56 rotate-6 rounded-sm bg-yellow-100 p-3 shadow-md ring-1 ring-yellow-300/50"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #fef9c3 0%, #fef3a8 100%)",
              }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                Aaj ka gyaan
              </p>
              <p
                className="mt-1 text-sm font-medium leading-snug text-zinc-900"
                style={{ fontFamily: "var(--font-bricolage)" }}
              >
                &ldquo;{scene.quote}&rdquo;
              </p>
              <p className="mt-1 text-[10px] italic text-zinc-600">{scene.author}</p>
            </div>
          </div>
        </div>

        {/* Right column: stats on top, mini billas below */}
        <div className="flex min-h-0 flex-col gap-3">
          {/* Diagnostics */}
          <div
            className="relative rounded-md border-2 border-zinc-300 bg-white p-3 shadow-sm"
            style={{ transform: `rotate(${rStats}deg)` }}
          >
            <div className="absolute -top-2 left-4 h-4 w-12 rotate-3 bg-pink-200/70 shadow-sm" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Intern Diagnostics
            </p>
            <div className="mt-2 space-y-1.5">
              {scene.stats.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-600">{s.label}</span>
                    <span className="font-mono font-semibold text-zinc-900">
                      {s.value}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full ${s.color}`}
                      style={{ width: `${Math.max(2, Math.min(100, s.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-md border-l-2 border-[#A6192E] bg-zinc-50 px-2 py-1">
              <p className="text-[10px] font-medium text-zinc-900">
                {scene.verdict}
              </p>
            </div>
          </div>

          {/* Mini billas — click to swap hero */}
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Tap to switch
            </p>
            <div className="grid flex-1 grid-cols-2 gap-2">
              {scene.miniBillas.map((b, i) => (
                <button
                  key={b.src}
                  onClick={() => switchToBilla(b)}
                  className="relative overflow-hidden rounded-sm bg-white p-1.5 pb-4 shadow-md transition-transform hover:scale-[1.04] hover:shadow-lg"
                  style={{ transform: `rotate(${miniRots[i] ?? 0}deg)` }}
                  title={b.name}
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-sm bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.src}
                      alt={b.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p
                    className="absolute inset-x-0 bottom-0 truncate px-1 pb-0.5 text-center text-[10px] font-medium italic text-zinc-700"
                    style={{ fontFamily: "var(--font-bricolage)" }}
                  >
                    {b.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
