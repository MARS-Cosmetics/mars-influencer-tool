"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles, Heart, RefreshCw } from "lucide-react";

// ============================================================
// Billa roster
// ============================================================

const BILLAS = {
  badmash: {
    src: "/billas/badmash_billa_with_jibbh.gif",
    name: "Badmash Billa",
    vibe: "Jibbh dikha raha hai. Disrespectful but kinda hot.",
  },
  banana: {
    src: "/billas/banana_billa.webp",
    name: "Banana Billa",
    vibe: "Potassium-rich content strategy. Goes off.",
  },
  bhigga: {
    src: "/billas/bhigga_billa.gif",
    name: "Bhigga Billa",
    vibe: "Caught in the rain like the intern's career. Drippy.",
  },
  bhikari: {
    src: "/billas/bhikari_billa.webp",
    name: "Bhikari Billa",
    vibe: "Stipend please. Or treats. Or attention.",
  },
  war: {
    src: "/billas/billa_in_a_war.gif",
    name: "War Billa",
    vibe: "Locked in. The Monday standup couldn't kill her.",
  },
  cute: {
    src: "/billas/cute_billa_with_smile.webp",
    name: "Cute Billa",
    vibe: "Smiling because the deadline is someone else's problem.",
  },
  pi: {
    src: "/billas/cute_pi_billa.webp",
    name: "Pi Billa",
    vibe: "3.14 reasons we're not finishing the deck.",
  },
  dilAttack: {
    src: "/billas/dil_attack_billa.webp",
    name: "Dil Attack Billa",
    vibe: "Cardiac event triggered by a WhatsApp ping.",
  },
  loveYou: {
    src: "/billas/love_you_billa.webp",
    name: "Love You Billa",
    vibe: "Manager said 'good work' once. Still recovering.",
  },
  mohehe: {
    src: "/billas/mohehe_billa.webp",
    name: "Mohehe Billa",
    vibe: "Laughing at our own brand book. Unhinged.",
  },
  muaa: {
    src: "/billas/muaa_papa_billa.webp",
    name: "Muaa Billa",
    vibe: "When the brief actually makes sense (rare). Sealed with a kiss.",
  },
  sad: {
    src: "/billas/sad_billa_with_phone.webp",
    name: "Sad Billa",
    vibe: "Scrolling LinkedIn looking for purpose.",
  },
  sleepy: {
    src: "/billas/sleepy_billa.gif",
    name: "Sleepy Billa",
    vibe: "POV: standup at 9 AM. Eyes? Closed. Brain? Gone.",
  },
  soba: {
    src: "/billas/soba_billaaa.webp",
    name: "Soba Billa",
    vibe: "The goal. The dream. The endgame.",
  },
  sus: {
    src: "/billas/sus_billa.gif",
    name: "Sus Billa",
    vibe: "Has questions about the brand book.",
  },
} as const;

type BillaKey = keyof typeof BILLAS;

// ============================================================
// Messages — sarcastic-emotional intern energy + marketing terms
// ============================================================

const INTRO_MESSAGE =
  "Hey 💋 This feature is still on hold. Instead of removing it I parked it here as a placeholder. Click a button below — I'll keep you entertained while we figure out what this page should actually do.";

const MESSAGES: string[] = [
  "I tried to build content ideas. The brief said 'something useful'. I closed it and opened cat gifs. We are here.",
  "Content Ideas is currently 'in production'. Production = the intern crying in the meeting room.",
  "I'm building this. Pinky promise. Stipend will guarantee delivery.",
  "Day 47 of trying to build content ideas. The cats keep distracting me. Send help.",
  "I had a plan. The plan was bad. Now we have billas.",
  "Brand book doesn't cover billa marketing strategy. We are pioneers.",
  "Manager said 'we need ideation'. The intern said 'we need cats'. Both correct.",
  "I asked marketing what to put here. They sent a meme. I sent a billa back. We're friends now.",
  "Roadmap update: still figuring it out. Launch ETA: when the founder remembers this page exists.",
  "I have 47 reference moodboards, 12 Pinterest boards, and zero actual ideas. The cats are my therapists.",
  "'Just make it pop.' I made it cats. Same energy.",
  "This was supposed to be analytics. I clicked the wrong folder. We live here now.",
  "The brief lives in my drafts. My drafts live in fear. I live in denial.",
  "Marketing approval pending. Cat approval granted. We proceed.",
  "Sprint planning said 2 days. Day 47 update: cats.",
  "I would've shipped this. Then I opened Instagram for 'reference'. 4 hours later. Cats.",
  "PM: 'where are we on content ideas?'. Me: 'pivoting'. The pivot: cats.",
  "Q3 OKRs: ship content ideas. Q4 OKRs: ship content ideas. Q5 OKRs: ship con— oh wait.",
  "We don't have a feature. We have a vibe. The vibe is cats.",
  "Marketing said the page should be 'engaging'. Engaging = cats. Engagement: 100%. Mission accomplished.",
  "I bring you: 0 content ideas, 15 billas, 1 emotional support page. Worth the stipend you haven't paid 🥺",
  "Manager asked for a wireframe. I sent a cat. She sent a thumbs up. The product is shipping itself.",
  "Reminder: 'going viral' is a coping mechanism, not a strategy. This page is mostly coping.",
  "Sometimes you build a tool. Sometimes you build a digital cat shrine. Personal growth.",
  "If the founder reads this: I tried. The cats wouldn't move. Send stipend regardless.",
  "Brief said 'premium, aspirational'. I gave you cats in polaroid frames. Premium aspirational? You decide.",
  "I'm not stuck. I'm in a 'strategic pause'. The pause has been going since onboarding.",
  "Marketing team: 'show us a prototype'. Prototype: this. Marketing team: 'we love it actually'. Iconic.",
  "Cat content has 300% higher engagement than enterprise software. We are simply chasing data.",
  "Disclaimer: building this feature is a personal project. Like sourdough. Or therapy.",
  "I will build content ideas. I promise. Right after I add one more billa. (15 billas later.)",
  "Founder's vision: comprehensive ideation engine. My version: 15 billas and a vibe. We meet... somewhere.",
  "We had a roadmap. The roadmap had cats on it. The cats won.",
  "Engineering update: this feature is currently a feeling. The feeling: 😶‍🌫️",
  "I asked AI to brainstorm content ideas. AI gave me 47 generic listicles. Cats > AI. We pivot.",
  "Marketing asked 'who's the target audience for this page?'. Me, alone, at 2 AM. That's the audience.",
  "I had ideation block. So I built a billa cabinet. The block remains. The cabinet thrives.",
  "Sprint retro: 'what went well?'. Me: the cats. 'What went wrong?'. The deadline. 'Action items?'. More cats.",
  "Asana ticket title: 'Build content-ideas feature'. Asana ticket status: 'In Progress'. The progress: existential.",
  "I had a stakeholder meeting about this page. The stakeholder was the cat. She approved.",
];

const BUTTONS = [
  { text: "Naya billa 🐱", icon: RefreshCw },
  { text: "Try harder, intern", icon: Sparkles },
  { text: "Tell intern it's ok 🥺", icon: Heart },
] as const;

// ============================================================
// Component
// ============================================================

const BILLA_KEYS = Object.keys(BILLAS) as BillaKey[];

function pickRandom<T>(arr: readonly T[], avoid?: T): T {
  if (arr.length === 1) return arr[0];
  let pick = arr[Math.floor(Math.random() * arr.length)];
  if (avoid !== undefined && pick === avoid) {
    pick = arr[Math.floor(Math.random() * arr.length)];
  }
  return pick;
}

function randomRotation(): number {
  // -3deg .. +3deg, never zero (so it always feels hand-pinned).
  const r = (Math.random() - 0.5) * 6;
  return r > 0 ? Math.max(0.5, r) : Math.min(-0.5, r);
}

export default function ContentIdeasPlaceholderPage() {
  const [billa, setBilla] = useState<BillaKey>("cute");
  const [message, setMessage] = useState<string>(INTRO_MESSAGE);
  const [rotation, setRotation] = useState<number>(-2);
  const [pulseKey, setPulseKey] = useState<number>(0); // forces re-mount for the entrance animation

  // refs to avoid same-thing-twice-in-a-row.
  const lastBilla = useRef<BillaKey>("cute");
  const lastMessage = useRef<string>(INTRO_MESSAGE);

  useEffect(() => {
    lastBilla.current = "cute";
    lastMessage.current = INTRO_MESSAGE;
  }, []);

  function shuffle() {
    const nextBilla = pickRandom(BILLA_KEYS, lastBilla.current);
    const nextMessage = pickRandom(MESSAGES, lastMessage.current);
    lastBilla.current = nextBilla;
    lastMessage.current = nextMessage;
    setBilla(nextBilla);
    setMessage(nextMessage);
    setRotation(randomRotation());
    setPulseKey((k) => k + 1);
  }

  function backToIntro() {
    setBilla("cute");
    setMessage(INTRO_MESSAGE);
    setRotation(-2);
    setPulseKey((k) => k + 1);
    lastBilla.current = "cute";
    lastMessage.current = INTRO_MESSAGE;
  }

  const current = BILLAS[billa];

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
              Content Ideas — placeholder edition
            </h1>
            <p className="text-[11px] text-zinc-500">
              Built by{" "}
              <span className="font-medium text-zinc-600">Anurag Sharma</span> —
              tech intern, i don't like cats but they are cute thooo
            </p>
          </div>
        </div>
        <Button
          onClick={backToIntro}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      {/* Center: polaroid card. Allowed to scroll if it overflows on small screens. */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-2">
        <div
          key={pulseKey}
          className="polaroid-pulse relative w-full max-w-md rounded-md bg-white p-3 pb-5 shadow-[0_14px_36px_-14px_rgba(0,0,0,0.35)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Masking tape */}
          <div className="absolute -top-3 left-1/2 h-6 w-28 -translate-x-1/2 -rotate-3 bg-yellow-200/70 shadow-sm" />

          {/* Billa image — shorter aspect so the card fits in a laptop viewport */}
          <div
            className="relative w-full overflow-hidden rounded-sm bg-zinc-100"
            style={{ aspectRatio: "3 / 2" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.name}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Billa name + vibe */}
          <div className="mt-2 text-center">
            <p
              className="text-base font-semibold italic text-zinc-900"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              {current.name}
            </p>
            <p className="mt-0.5 text-[11px] italic text-zinc-500">
              {current.vibe}
            </p>
          </div>

          {/* Speech-bubble message */}
          <div
            className="mt-3 rounded-xl border border-yellow-200/60 bg-yellow-50 px-4 py-2.5"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #fef9c3 0%, #fef3a8 100%)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Aaj ka gyaan
            </p>
            <p
              className="mt-1 text-sm leading-snug text-zinc-900"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              &ldquo;{message}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Buttons — outside the card, pinned to the bottom of the page so they
          are ALWAYS visible regardless of card size or viewport height. */}
      <div className="flex shrink-0 flex-wrap justify-center gap-2 pt-1">
        {BUTTONS.map((b) => (
          <button
            key={b.text}
            type="button"
            onClick={shuffle}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-md active:translate-y-0"
          >
            <b.icon className="h-3.5 w-3.5" />
            {b.text}
          </button>
        ))}
      </div>

      <style jsx>{`
        @keyframes polaroidIn {
          0% {
            transform: scale(0.97);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .polaroid-pulse {
          animation: polaroidIn 220ms ease-out;
        }
      `}</style>
    </div>
  );
}
