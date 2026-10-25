// The 77 Thai provinces. Mirrors public.provinces (migration 20261025000400); the database is the source of truth.
export type Region = "north" | "northeast" | "central" | "east" | "west" | "south";
export type Province = { th: string; en: string; region: Region };

export const REGION_LABEL: Record<Region, string> = {
  north: "ภาคเหนือ", northeast: "ภาคตะวันออกเฉียงเหนือ", central: "ภาคกลาง", east: "ภาคตะวันออก", west: "ภาคตะวันตก", south: "ภาคใต้",
};

const byRegion: Record<Region, [string, string][]> = {
  north: [["เชียงราย", "Chiang Rai"], ["เชียงใหม่", "Chiang Mai"], ["น่าน", "Nan"], ["พะเยา", "Phayao"], ["แพร่", "Phrae"], ["แม่ฮ่องสอน", "Mae Hong Son"], ["ลำปาง", "Lampang"], ["ลำพูน", "Lamphun"], ["อุตรดิตถ์", "Uttaradit"]],
  northeast: [["กาฬสินธุ์", "Kalasin"], ["ขอนแก่น", "Khon Kaen"], ["ชัยภูมิ", "Chaiyaphum"], ["นครพนม", "Nakhon Phanom"], ["นครราชสีมา", "Nakhon Ratchasima"], ["บึงกาฬ", "Bueng Kan"], ["บุรีรัมย์", "Buri Ram"], ["มหาสารคาม", "Maha Sarakham"], ["มุกดาหาร", "Mukdahan"], ["ยโสธร", "Yasothon"], ["ร้อยเอ็ด", "Roi Et"], ["เลย", "Loei"], ["ศรีสะเกษ", "Si Sa Ket"], ["สกลนคร", "Sakon Nakhon"], ["สุรินทร์", "Surin"], ["หนองคาย", "Nong Khai"], ["หนองบัวลำภู", "Nong Bua Lam Phu"], ["อำนาจเจริญ", "Amnat Charoen"], ["อุดรธานี", "Udon Thani"], ["อุบลราชธานี", "Ubon Ratchathani"]],
  central: [["กรุงเทพมหานคร", "Bangkok"], ["กำแพงเพชร", "Kamphaeng Phet"], ["ชัยนาท", "Chai Nat"], ["นครนายก", "Nakhon Nayok"], ["นครปฐม", "Nakhon Pathom"], ["นครสวรรค์", "Nakhon Sawan"], ["นนทบุรี", "Nonthaburi"], ["ปทุมธานี", "Pathum Thani"], ["พระนครศรีอยุธยา", "Phra Nakhon Si Ayutthaya"], ["พิจิตร", "Phichit"], ["พิษณุโลก", "Phitsanulok"], ["เพชรบูรณ์", "Phetchabun"], ["ลพบุรี", "Lop Buri"], ["สมุทรปราการ", "Samut Prakan"], ["สมุทรสงคราม", "Samut Songkhram"], ["สมุทรสาคร", "Samut Sakhon"], ["สระบุรี", "Saraburi"], ["สิงห์บุรี", "Sing Buri"], ["สุโขทัย", "Sukhothai"], ["สุพรรณบุรี", "Suphan Buri"], ["อ่างทอง", "Ang Thong"], ["อุทัยธานี", "Uthai Thani"]],
  east: [["จันทบุรี", "Chanthaburi"], ["ฉะเชิงเทรา", "Chachoengsao"], ["ชลบุรี", "Chon Buri"], ["ตราด", "Trat"], ["ปราจีนบุรี", "Prachin Buri"], ["ระยอง", "Rayong"], ["สระแก้ว", "Sa Kaeo"]],
  west: [["กาญจนบุรี", "Kanchanaburi"], ["ตาก", "Tak"], ["ประจวบคีรีขันธ์", "Prachuap Khiri Khan"], ["เพชรบุรี", "Phetchaburi"], ["ราชบุรี", "Ratchaburi"]],
  south: [["กระบี่", "Krabi"], ["ชุมพร", "Chumphon"], ["ตรัง", "Trang"], ["นครศรีธรรมราช", "Nakhon Si Thammarat"], ["นราธิวาส", "Narathiwat"], ["ปัตตานี", "Pattani"], ["พังงา", "Phang Nga"], ["พัทลุง", "Phatthalung"], ["ภูเก็ต", "Phuket"], ["ยะลา", "Yala"], ["ระนอง", "Ranong"], ["สงขลา", "Songkhla"], ["สตูล", "Satun"], ["สุราษฎร์ธานี", "Surat Thani"]],
};

export const REGIONS = Object.keys(byRegion) as Region[];
export const PROVINCES: Province[] = REGIONS.flatMap((region) => byRegion[region].map(([th, en]) => ({ th, en, region })));
export const DEFAULT_PROVINCE = "เชียงใหม่";

// Old labels and homepage ids (content.ts) that point at a province.
const ALIASES: Record<string, string> = {
  "กรุงเทพฯ": "กรุงเทพมหานคร", "กรุงเทพ": "กรุงเทพมหานคร", "กทม": "กรุงเทพมหานคร", "กทม.": "กรุงเทพมหานคร",
  "bangkok": "กรุงเทพมหานคร", "chiang-mai": "เชียงใหม่", "phuket": "ภูเก็ต", "krabi": "กระบี่",
};

/** Resolve a Thai/English name, old label or homepage id to a province name, or null. */
export function toProvince(value: string | null | undefined): string | null {
  const key = value?.trim();
  if (!key) return null;
  const alias = ALIASES[key] ?? ALIASES[key.toLowerCase()];
  if (alias) return alias;
  const lower = key.toLowerCase();
  return PROVINCES.find((p) => p.th === key || p.en.toLowerCase() === lower)?.th ?? null;
}

/** Provinces whose Thai name, English name or alias contains the query; prefix matches first. */
export function searchProvinces(query: string): Province[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return PROVINCES;
  const aliasHits = new Set(Object.entries(ALIASES).filter(([alias]) => alias.includes(q)).map(([, th]) => th));
  const score = (p: Province) => {
    const en = p.en.toLowerCase();
    if (p.th.startsWith(q) || en.startsWith(q)) return 0;
    if (p.th.includes(q) || en.includes(q) || en.replace(/ /g, "").includes(q.replace(/ /g, ""))) return 1;
    return aliasHits.has(p.th) ? 2 : -1;
  };
  return PROVINCES.map((p) => [p, score(p)] as const).filter(([, s]) => s >= 0).sort((a, b) => a[1] - b[1]).map(([p]) => p);
}
