export type Destination = {
  id: string;
  name: string;
  english: string;
  region: string;
  blurb: string;
  index: string;
  color: string;
  image: string;
};

export const destinations: Destination[] = [
  {
    id: "chiang-mai",
    name: "เชียงใหม่",
    english: "CHIANG MAI",
    region: "ภาคเหนือ",
    blurb: "ดอยสุเทพ เมืองเก่า และไอหมอกแห่งขุนเขา",
    index: "01",
    color: "#40593c",
    image: "/images/chiangmai-temple.webp",
  },
  {
    id: "phuket",
    name: "ภูเก็ต",
    english: "PHUKET",
    region: "ภาคใต้",
    blurb: "หาดทรายสีขาว น้ำทะเลสีมรกต และแสงอาทิตย์ยามเย็น",
    index: "02",
    color: "#355e61",
    image: "/images/phuket-beach.webp",
  },
  {
    id: "krabi",
    name: "กระบี่",
    english: "KRABI",
    region: "ภาคใต้",
    blurb: "หน้าผาหินปูน เรือหางยาว และหมู่เกาะที่เงียบสงบ",
    index: "03",
    color: "#7d532c",
    image: "/images/krabi-boats.webp",
  },
  {
    id: "bangkok",
    name: "กรุงเทพมหานคร",
    english: "BANGKOK",
    region: "ภาคกลาง",
    blurb: "พระนครเก่า ตลาดกลางคืน และรสชาติที่ไม่เคยหลับ",
    index: "04",
    color: "#453b32",
    image: "/images/bangkok-golden.webp",
  },
];

export type ShowcaseSlide = {
  id: string;
  name: string;
  english: string;
  note: string;
  image: string;
  alt: string;
  position: string;
  backgroundTint: string;
  backgroundImage: string;
};

export const showcaseSlides: ShowcaseSlide[] = [
  {
    id: "krabi",
    name: "กระบี่",
    english: "KRABI",
    note: "ทะเลอันดามัน · ประเทศไทย",
    image: "/images/krabi-boats.webp",
    alt: "เรือหางยาวจอดอยู่หน้าผาหินปูนกลางทะเลกระบี่",
    position: "50% 62%",
    backgroundTint: "#9bd3cd",
    backgroundImage: "/images/phuket-beach.webp",
  },
  {
    id: "chiang-mai",
    name: "เชียงใหม่",
    english: "CHIANG MAI",
    note: "ล้านนา · ภาคเหนือ",
    image: "/images/chiangmai-temple.webp",
    alt: "วัดล้านนาสีทองท่ามกลางท้องฟ้าสีฟ้าในเชียงใหม่",
    position: "50% 55%",
    backgroundTint: "#8ea46e",
    backgroundImage: "/images/chiangmai-temple.webp",
  },
  {
    id: "bangkok",
    name: "กรุงเทพมหานคร",
    english: "BANGKOK",
    note: "พระนคร · ภาคกลาง",
    image: "/images/bangkok-golden.webp",
    alt: "ภาพมุมสูงของพระบรมมหาราชวังยามค่ำในกรุงเทพมหานคร",
    position: "50% 58%",
    backgroundTint: "#d7a56d",
    backgroundImage: "/images/bangkok-golden.webp",
  },
];

export type PackagePlan = {
  id: string;
  tag: string;
  title: string;
  english: string;
  meta: string;
  price: string;
  image: string;
  alt: string;
};

export const packagePlans: PackagePlan[] = [
  {
    id: "chiang-mai-plan",
    tag: "ยอดนิยม",
    title: "เชียงใหม่ · ล้านนา 3 วัน 2 คืน",
    english: "LAN NA RETREAT",
    meta: "ที่พักบูทีค · อาหารเช้า · ไกด์ท้องถิ่น",
    price: "5,900",
    image: "/images/chiangmai-temple.webp",
    alt: "วัดเชียงใหม่สีทอง",
  },
  {
    id: "phuket-plan",
    tag: "ใหม่",
    title: "ภูเก็ต · อันดามัน 4 วัน 3 คืน",
    english: "ANDAMAN SLOWDOWN",
    meta: "โรงแรมริมทะเล · อาหารเช้า · ทริปเกาะ",
    price: "8,900",
    image: "/images/phuket-beach.webp",
    alt: "หาดทรายและทะเลสีเทอร์ควอยซ์",
  },
  {
    id: "bangkok-plan",
    tag: "เมือง",
    title: "กรุงเทพมหานคร · พระนคร 2 วัน 1 คืน",
    english: "OLD TOWN EDITION",
    meta: "โรงแรมกลางเมือง · อาหารเช้า · รถรับส่ง",
    price: "3,900",
    image: "/images/bangkok-golden.webp",
    alt: "พระบรมมหาราชวังยามค่ำ",
  },
];
