import { icon } from "./icons.js";

const HEADING_ICONS = {
  "0901": "coffee", "0902": "coffee", "2204": "wine", "2203": "beer", "2201": "glass-water", "2202": "glass-water",
  "2208": "wine", "0401": "milk", "0406": "milk", "0803": "banana", "0805": "apple", "0808": "apple",
  "1806": "candy", "1905": "croissant", "1704": "candy", "0201": "beef", "0202": "beef", "0203": "beef", "0207": "beef",
  "0302": "fish", "0303": "fish", "0304": "fish", "8703": "car", "8704": "truck", "8711": "bike", "8712": "bike",
  "8802": "plane", "8803": "plane", "8807": "plane", "8901": "ship", "8517": "smartphone", "8471": "laptop", "8528": "tv",
  "3004": "pill", "3002": "syringe", "2402": "cigarette", "2403": "cigarette", "2710": "fuel", "2711": "fuel", "2716": "zap",
  "3303": "sparkles", "3304": "sparkles", "9102": "watch", "9101": "watch", "7113": "gem", "7108": "gem", "4901": "book",
  "9503": "gift", "9504": "gamepad-2", "9403": "sofa", "9401": "sofa", "6403": "footprints", "6404": "footprints",
  "8418": "refrigerator", "8450": "washing-machine", "9405": "lamp", "7005": "glass-water",
};

const CHAPTER_ICONS = {
  "03": "fish", "04": "milk", "22": "wine", "24": "cigarette", "27": "fuel", "30": "pill", "33": "sparkles",
  "61": "shirt", "62": "shirt", "64": "footprints", "71": "gem", "84": "cog", "85": "zap", "87": "car", "88": "plane",
  "89": "ship", "94": "sofa", "95": "gift",
};

export function representativeProductIcon(code) {
  const name = code.length === 2 ? CHAPTER_ICONS[code] : HEADING_ICONS[code.slice(0, 4)];
  return name ? icon(name) : "";
}

export const EVERYDAY_PRODUCTS = ["0901", "2204", "8703", "8517", "3004", "2710", "0803", "1806", "8471", "2402", "8712", "0406", "2203", "9403", "64", "9503"];

export const SUGGESTED_PRODUCTS = ["0901", "2204", "8703", "8517", "3004", "4011", "72", "2710"];
