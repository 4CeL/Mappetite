/**
 * Curated high-resolution culinary photography matching food categories and tags.
 * Falls back to category-based photography or place-specific photo if provided.
 */

const PHOTO_MAP = [
  {
    keywords: ["ramen", "mie", "bakmi", "noodle", "udon", "pho", "kwetiau"],
    url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["sate", "satay", "bbq", "grill", "bakar", "steak", "yakiniku", "sambal", "cobek"],
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["sushi", "sashimi", "japanese", "japan", "bento"],
    url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["pizza", "pasta", "italian", "spaghetti"],
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["hotpot", "shabu", "sukiyaki", "soup", "soto", "bakso"],
    url: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["kopi", "coffee", "cafe", "kafe", "espresso", "latte", "brunch"],
    url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["dessert", "cake", "kue", "ice cream", "gelato", "bakery", "roti", "pastry"],
    url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["burger", "sandwich", "ayam goreng", "fried chicken", "fast food"],
    url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["seafood", "ikan", "fish", "cumi", "udang", "kepiting"],
    url: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=600&auto=format&fit=crop&q=80",
  },
  {
    keywords: ["indonesian", "tradisional", "nusantara", "padang", "nasi", "warung"],
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
  },
];

const DEFAULT_FOOD_PHOTO =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80";

export function getFoodPhoto(place) {
  if (place?.photo_url) return place.photo_url;

  const haystack = ` ${[
    ...(place?.tags || []).map((t) => t.name),
    place?.name || "",
    place?.notes || "",
  ]
    .join(" ")
    .toLowerCase()} `;

  const match = PHOTO_MAP.find((item) =>
    item.keywords.some((kw) => haystack.includes(kw.toLowerCase()))
  );

  return match ? match.url : DEFAULT_FOOD_PHOTO;
}

/** Format relative time: "Added 2 days ago", "Added 1 week ago", etc. */
export function formatRelativeTime(dateString, lang = "id") {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (lang === "en") {
      if (diffDays === 0) return "Added today";
      if (diffDays === 1) return "Added yesterday";
      if (diffDays < 7) return `Added ${diffDays} days ago`;
      const weeks = Math.floor(diffDays / 7);
      if (weeks === 1) return "Added 1 week ago";
      if (weeks < 4) return `Added ${weeks} weeks ago`;
      const months = Math.floor(diffDays / 30);
      if (months <= 1) return "Added 1 month ago";
      return `Added ${months} months ago`;
    }

    // Bahasa Indonesia
    if (diffDays === 0) return "Ditambahkan hari ini";
    if (diffDays === 1) return "Ditambahkan kemarin";
    if (diffDays < 7) return `Ditambahkan ${diffDays} hari lalu`;
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return "Ditambahkan 1 minggu lalu";
    if (weeks < 4) return `Ditambahkan ${weeks} minggu lalu`;
    const months = Math.floor(diffDays / 30);
    if (months <= 1) return "Ditambahkan 1 bulan lalu";
    return `Ditambahkan ${months} bulan lalu`;
  } catch {
    return "";
  }
}
