# Discovery Feature — AI-Powered Influencer Search

Self-contained feature for finding Influenzer.ai creators using a campaign
context + quick-filter chips + a free-text prompt parsed by an LLM.

## Folder layout

```
src/features/discovery/
├── components/              # React UI components (client-side)
│   ├── DiscoverForm.tsx     # top-level form
│   ├── QuickFilters.tsx     # country / gender / age chips
│   ├── ResultsGrid.tsx      # results list
│   ├── CreatorCard.tsx      # one creator + bookmark toggle
│   └── BookmarksList.tsx    # bookmarks tab
├── hooks/                   # React hooks (client-side)
│   ├── useDiscoverySearch.ts
│   └── useBookmarks.ts
├── lib/
│   ├── influenzer/          # Influenzer.ai Filter API client (server-only)
│   │   ├── auth.ts          # login + token cache + apiFetch
│   │   ├── filter.ts        # POST /search/filter
│   │   ├── dictionaries.ts  # locations / languages / interests resolver + cache
│   │   └── schema.ts        # Zod schema for filter requests
│   ├── llm/                 # Groq-based LLM parser (server-only)
│   │   ├── groqClient.ts    # OpenAI-compatible client pointed at Groq
│   │   └── filterParser.ts  # prompt → semantic filter JSON
│   ├── mergeFilters.ts      # merges LLM output + explicit quickFilters
│   └── types.ts             # shared feature types
└── README.md                # you are here
```

Next.js route handlers (can't live inside a feature folder under App Router)
live here and are thin 1-liners that import from this feature:

```
src/app/api/discovery/search/route.ts
src/app/api/discovery/bookmark/route.ts
src/app/api/discovery/bookmark/[id]/route.ts
src/app/(dashboard)/discover/page.tsx
```

## Required env vars

```env
# Groq — LLM for parsing user prompts into filters
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile      # optional override

# Influenzer (CREATORX_* — may already exist in .env)
CREATORX_BASE_URL=https://server-test.influenzer.ai
CREATORX_EMAIL=...
CREATORX_PASSWORD=...
CREATORX_ACCOUNT_TYPE=agency
```

## Kill switch — how to remove this feature

If the feature breaks or you want to disable it:

1. Delete `src/features/discovery/`
2. Delete `src/app/api/discovery/`
3. Delete `src/app/(dashboard)/discover/`
4. In `prisma/schema.prisma`:
   - Remove the `DiscoveryBookmark` and `InfluencerSearch` models
   - Remove the reverse relations on `User` (`discoveryBookmarks`, `influencerSearches`) and `Campaign` (same)
   - Run `npx prisma db push` (or write a migration to drop the tables)
5. Remove the `GROQ_*` env vars
6. Remove the "Discover" link from any nav you added

Nothing else in the codebase imports from `src/features/discovery/` — this
is enforced by a simple grep before merging changes.

## How it flows end-to-end

```
User picks Campaign + Platform + QuickFilters + writes a prompt
            │
            ▼
POST /api/discovery/search
  → load Campaign + Brand
  → llm.parseFilter({campaign, prompt, quickFilters, platform})  — Groq
  → mergeFilters(llm output, quickFilters)  — quickFilters always win
  → dictionaries.resolve(names → IDs)  — locations, languages
  → influenzer.filterCreators(platform, filter)
  → log to InfluencerSearch table
  → return {creators, total, pagination, balance}

User bookmarks → POST /api/discovery/bookmark → DiscoveryBookmark row
```
