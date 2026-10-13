import { CakeSlice, Coffee, Fish, Flame, Pizza, Sandwich, Soup, UtensilsCrossed } from "lucide-react";

// Thumbnail illustration per category (DESIGN.md: no Google photos in the free version).
const CATEGORIES = [
  { id: "coffee", Icon: Coffee, bg: "#F6EBDD", fg: "#8B5E3C", words: ["kopi", "coffee", "cafe", "kafe", "café", "espresso", "teh", "tea"] },
  { id: "noodle", Icon: Soup, bg: "#FDE8E1", fg: "#C2410C", words: ["ramen", "mie", "mi ", "bakmi", "noodle", "udon", "pho", "soto", "bakso", "sup", "soup", "kwetiau"] },
  { id: "grill", Icon: Flame, bg: "#E3F2E6", fg: "#B5452C", words: ["sate", "satay", "bbq", "grill", "bakar", "steak", "yakiniku", "korean bbq"] },
  { id: "dessert", Icon: CakeSlice, bg: "#FCE7F3", fg: "#BE185D", words: ["dessert", "cake", "kue", "es krim", "ice cream", "gelato", "bakery", "roti", "donut", "martabak"] },
  { id: "pizza", Icon: Pizza, bg: "#FEF3C7", fg: "#B45309", words: ["pizza", "pasta", "italian", "italia"] },
  { id: "seafood", Icon: Fish, bg: "#E0F2FE", fg: "#0369A1", words: ["seafood", "ikan", "fish", "sushi", "kepiting", "udang", "cumi"] },
  { id: "burger", Icon: Sandwich, bg: "#FFEDD5", fg: "#C2410C", words: ["burger", "sandwich", "kebab", "hotdog", "fried chicken", "ayam goreng"] },
];

const DEFAULT_CATEGORY = { id: "default", Icon: UtensilsCrossed, bg: "#EEF0E6", fg: "#5D6C4B" };

export function categoryFor(place) {
  const haystack = ` ${[...(place?.tags || []).map((tag) => tag.name), place?.name || ""].join(" ").toLowerCase()} `;
  return CATEGORIES.find((category) => category.words.some((word) => haystack.includes(word))) || DEFAULT_CATEGORY;
}
