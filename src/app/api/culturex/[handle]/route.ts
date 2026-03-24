import { NextResponse } from "next/server";
import { fetchPublicProfile } from "@/lib/instagram";

export async function GET(
  request: Request,
  props: { params: Promise<{ handle: string }> }
) {
  const { handle } = await props.params;

  // Mock CultureX response - replace with real API when ready
  // In production: fetch(`https://api.culturex.com/v1/profile/${handle}`, { headers: { Authorization: `Bearer ${process.env.CULTUREX_API_KEY}` } })

  const mockData = {
    found: true,
    source: "culturex" as "culturex" | "instagram_fallback",
    handle,
    name: handle.replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    bio: "Beauty & Lifestyle Creator",
    profileImageUrl: null,
    igFollowerCount: Math.floor(Math.random() * 500000) + 10000,
    igFollowingCount: Math.floor(Math.random() * 2000) + 200,
    igPostCount: Math.floor(Math.random() * 500) + 50,
    igEngagementRate: (Math.random() * 5 + 1).toFixed(2),
    igAvgLikes: Math.floor(Math.random() * 10000) + 500,
    igAvgComments: Math.floor(Math.random() * 500) + 20,
    igAvgReelViews: Math.floor(Math.random() * 200000) + 10000,
    igAvgStoryViews: Math.floor(Math.random() * 50000) + 5000,
    igMedianReelViews: Math.floor(Math.random() * 150000) + 8000,
    igCredibilityScore: (Math.random() * 20 + 75).toFixed(2),
    igAudienceMalePct: (Math.random() * 30 + 10).toFixed(2),
    igAudienceFemalePct: (100 - parseFloat((Math.random() * 30 + 10).toFixed(2))).toFixed(2),
    igAudienceTopAgeRange: "18-34",
    igAudienceTopCities: { "Mumbai": 18, "Delhi": 15, "Bangalore": 12, "Hyderabad": 8, "Pune": 6 },
    igAudienceTopCountries: { "India": 85, "USA": 5, "UK": 3 },
    categories: ["beauty", "lifestyle"],
    tier: null as string | null, // will be calculated
  };

  // Auto-calculate tier
  if (mockData.igFollowerCount < 10000) mockData.tier = "nano";
  else if (mockData.igFollowerCount < 50000) mockData.tier = "micro";
  else if (mockData.igFollowerCount < 200000) mockData.tier = "mid";
  else if (mockData.igFollowerCount < 1000000) mockData.tier = "macro";
  else mockData.tier = "mega";

  // In production, check if CultureX returned data. If not, fall back to Instagram.
  // Simulate: if CultureX returns found=true, return it. Otherwise, try Instagram.
  if (mockData.found) {
    return NextResponse.json(mockData);
  }

  // ===== INSTAGRAM FALLBACK =====
  // If CultureX returns no data (404 or empty), fall back to Instagram scraper
  return instagramFallback(handle);
}

async function instagramFallback(handle: string) {
  try {
    const profile = await fetchPublicProfile(handle);

    // Calculate tier from follower count
    let tier: string;
    if (profile.followerCount < 10000) tier = "nano";
    else if (profile.followerCount < 50000) tier = "micro";
    else if (profile.followerCount < 200000) tier = "mid";
    else if (profile.followerCount < 1000000) tier = "macro";
    else tier = "mega";

    return NextResponse.json({
      found: true,
      source: "instagram_fallback" as const,
      handle: profile.username,
      name: profile.fullName,
      bio: profile.biography,
      profileImageUrl: profile.profilePicUrl,
      igFollowerCount: profile.followerCount,
      igFollowingCount: profile.followingCount,
      igPostCount: profile.postCount,
      // These fields are unavailable from Instagram public scraping
      igEngagementRate: null,
      igAvgLikes: null,
      igAvgComments: null,
      igAvgReelViews: null,
      igAvgStoryViews: null,
      igMedianReelViews: null,
      igCredibilityScore: null,
      igAudienceMalePct: null,
      igAudienceFemalePct: null,
      igAudienceTopAgeRange: null,
      igAudienceTopCities: null,
      igAudienceTopCountries: null,
      categories: [],
      tier,
    });
  } catch (error) {
    console.error("Instagram fallback also failed:", error);
    return NextResponse.json({ found: false, source: "instagram_fallback" }, { status: 404 });
  }
}
