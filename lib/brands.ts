import { BrandProfile } from "./types";

export const BRANDS: Record<string, BrandProfile> = {
  dongdong: {
    id: "dongdong",
    name: "東東石頭火鍋",
    emoji: "🍲",
    positioning: ["石頭火鍋", "聚餐", "肉類", "火鍋", "台灣年輕族群", "朋友聚會"],
    toneNotes: [
      "台灣口語",
      "有點嘴賤",
      "幹話感",
      "幽默、可以自嘲",
      "不要太官方，不要像傳統餐廳廣告",
    ],
    example:
      "初級大人：\n今天吃什麼？\n\n高級大人：\n東東訂位了嗎？\n\n頂級大人：\n肉盤先點兩份。",
  },
  yunan: {
    id: "yunan",
    name: "魚男熟成魚",
    emoji: "🐟",
    positioning: ["生魚片", "丼飯", "熟成魚", "海鮮", "日本料理元素"],
    toneNotes: [
      "冷幽默，帶一點聰明感",
      "可以雙關",
      "有質感但不能太文青",
      "不要太油，不要像高級餐廳公關稿",
    ],
    example:
      "別人吃生魚片：\n\n匆匆忙忙\n連滾帶爬。\n\n魚男：\n\n從從容容\n游刃有餘。\n\n畢竟魚都熟成好了。\n\n你急什麼。",
  },
  renxing: {
    id: "renxing",
    name: "任性俱樂部",
    emoji: "🌭",
    positioning: ["熱狗堡", "Pizza", "西式餐飲", "年輕族群", "宵夜", "朋友聚會"],
    toneNotes: [
      "年輕、Threads 廢文感",
      "Meme、網路用語",
      "荒謬，可以白爛",
      "可以故意不太正常",
    ],
    example:
      "今天很熱。\n\n所以我們決定：\n\n熱狗堡照吃\n披薩照吃\n\n然後喝冰的。\n\n真冰涼。\n\n這才是成年人該有的自律。",
  },
};

export const BRAND_LIST = Object.values(BRANDS);
