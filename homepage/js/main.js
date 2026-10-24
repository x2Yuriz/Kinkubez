/* เที่ยวไทย · Thailand Travel — static, no dependencies. */
(() => {
  "use strict";

  const CONTACT = "hello@tiewthai.co";
  const IMG = "assets/img/";

  /* ---------- Content ---------- */

  const destinations = [
    {
      id: "chiang-mai", th: "เชียงใหม่", en: "Chiang Mai", region: "North", regionTh: "ภาคเหนือ",
      img: "chiang-mai.jpg", pos: "50% 45%", tint: "28, 74, 52",
      alt: "พระมหาธาตุนภเมทนีดลบนยอดดอยอินทนนท์ ล้อมด้วยสวนดอกไม้",
      desc: "เมืองแห่งวัฒนธรรม ธรรมชาติ และอาหารเหนือสุดอร่อย",
      sub: "ธรรมชาติ วัฒนธรรม อาหารเหนือ",
      best: "พฤศจิกายน – กุมภาพันธ์",
      highlights: ["วัดพระธาตุดอยสุเทพ มองเห็นเมืองทั้งเมือง", "เดินเล่นคูเมืองและถนนคนเดินวันอาทิตย์", "ทะเลหมอกและน้ำตกที่ดอยอินทนนท์"],
      pkg: "north",
    },
    {
      id: "phuket", th: "ภูเก็ต", en: "Phuket", region: "Andaman", regionTh: "ภาคใต้",
      img: "phuket.jpg", pos: "50% 60%", tint: "22, 86, 118",
      alt: "มุมสูงของหาดทรายขาวและน้ำทะเลสีฟ้าใสริมเนินเขา ภูเก็ต",
      desc: "ทะเลสวย น้ำใส กิจกรรมทางน้ำ และหาดทรายขาว",
      sub: "หาด เมืองเก่า และอาหารใต้",
      best: "พฤศจิกายน – เมษายน",
      highlights: ["หาดกะตะและกะรนช่วงพระอาทิตย์ตก", "ตึกเก่าย่านถนนถลางและถนนดีบุก", "ชิมโอ้เอ๋วและหมี่ฮกเกี้ยนในเมือง"],
      pkg: "andaman",
    },
    {
      id: "krabi", th: "กระบี่", en: "Krabi", region: "Andaman", regionTh: "ภาคใต้",
      img: "krabi.jpg", pos: "50% 55%", tint: "30, 84, 76",
      alt: "เรือหางยาวจอดหน้าเกาะปอดะ กระบี่ มีหินปูนสูงตระหง่าน",
      desc: "เกาะสวย ผาหินปูน ธรรมชาติที่ต้องไปสักครั้ง",
      sub: "ทะเลสีเขียวมรกต • ผาหินปูน",
      best: "พฤศจิกายน – เมษายน",
      highlights: ["นั่งเรือหางยาวเที่ยวทะเลแหวกและเกาะปอดะ", "ปีนผาหรือพายคายัคที่ไร่เลย์", "ดูพระอาทิตย์ตกที่หาดอ่าวนาง"],
      pkg: "andaman",
    },
    {
      id: "bangkok", th: "กรุงเทพฯ", en: "Bangkok", region: "Central", regionTh: "ภาคกลาง",
      img: "bangkok.jpg", pos: "50% 50%", tint: "84, 56, 40",
      alt: "วัดอรุณราชวรารามยามพลบค่ำริมแม่น้ำเจ้าพระยา",
      desc: "วัดสวย อาหารอร่อย และแหล่งช้อปปิ้งมากมาย",
      sub: "เมืองแห่งรอยยิ้ม • วัดอรุณราชวราราม",
      best: "พฤศจิกายน – กุมภาพันธ์",
      highlights: ["วัดอรุณฯ ยามพลบค่ำจากฝั่งท่าเตียน", "นั่งเรือด่วนเจ้าพระยาเที่ยวเกาะรัตนโกสินทร์", "เดินกินเยาวราชหลังหกโมงเย็น"],
      pkg: "bangkok",
    },
  ];

  const byId = Object.fromEntries(destinations.map((d) => [d.id, d]));

  /* Carousel order puts Krabi in the centre with Chiang Mai and Bangkok either side. */
  const slides = ["chiang-mai", "krabi", "bangkok"].map((id) => byId[id]);
  const START = 1;

  const packages = [
    {
      id: "north", badge: "ยอดนิยม", where: "เชียงใหม่", title: "เชียงใหม่ · ล้านนา 3 วัน 2 คืน",
      duration: "3 วัน 2 คืน", price: 5900, img: "pkg-north.jpg",
      alt: "วิหารไม้แบบล้านนาและเจดีย์ขาว วัดพระสิงห์ เชียงใหม่",
      meta: ["ที่พักบูทีค", "อาหารเช้า", "ไกด์ท้องถิ่น"],
      desc: "เดินวัดล้านนาในคูเมือง ขึ้นดอยอินทนนท์ แล้วปิดท้ายด้วยมื้อขันโตก",
      includes: ["โรงแรมบูทีคในคูเมือง 2 คืน พร้อมอาหารเช้า", "รถพร้อมคนขับขึ้นดอยอินทนนท์", "ไกด์ท้องถิ่นพาเดินวัดในเมืองเก่า", "มื้อขันโตกหนึ่งมื้อ"],
      days: ["ถึงเชียงใหม่ วัดพระสิงห์ วัดเจดีย์หลวง และถนนคนเดิน", "ดอยอินทนนท์ พระมหาธาตุ และน้ำตกวชิรธาร", "ดอยสุเทพยามเช้า แล้วส่งสนามบิน"],
    },
    {
      id: "andaman", badge: "ใหม่", where: "ภูเก็ต", title: "ภูเก็ต · อันดามัน 4 วัน 3 คืน",
      duration: "4 วัน 3 คืน", price: 8900, img: "pkg-andaman.jpg",
      alt: "อ่าวมาหยา เกาะพีพีเล หาดทรายขาวล้อมด้วยผาหินปูน",
      meta: ["โรงแรมริมทะเล", "อาหารเช้า", "ทริปเกาะ"],
      desc: "พักริมหาดกะตะ นั่งเรือเร็วไปพีพี และล่องอ่าวพังงาท่ามกลางผาหินปูน",
      includes: ["โรงแรมริมหาดกะตะ 3 คืน พร้อมอาหารเช้า", "เรือเร็วไปหมู่เกาะพีพี พร้อมอุปกรณ์ดำน้ำตื้น", "ทริปอ่าวพังงาแบบเรือหางยาว", "รถรับส่งสนามบินภูเก็ต"],
      days: ["ถึงภูเก็ต เดินเมืองเก่า ถนนถลาง", "เรือเร็วไปพีพีเล อ่าวมาหยา และดำน้ำตื้น", "อ่าวพังงา เกาะปันหยี และเขาตะปู", "หาดกะตะยามเช้า แล้วส่งสนามบิน"],
    },
    {
      id: "bangkok", badge: "ทริปสั้น", where: "กรุงเทพฯ", title: "กรุงเทพฯ · พระนคร 2 วัน 1 คืน",
      duration: "2 วัน 1 คืน", price: 3900, img: "pkg-bangkok.jpg",
      alt: "พระอุโบสถวัดพระศรีรัตนศาสดาราม ขนาบด้วยเจดีย์ทอง",
      meta: ["โรงแรมกลางเมือง", "อาหารเช้า", "ไกด์นำเที่ยว"],
      desc: "วัดพระแก้ว วัดอรุณฯ ยามเย็น และเยาวราชหลังพระอาทิตย์ตก",
      includes: ["โรงแรมกลางเมือง 1 คืน พร้อมอาหารเช้า", "บัตรเข้าชมวัดพระแก้วและวัดอรุณฯ", "ไกด์พาเดินเยาวราชช่วงค่ำ"],
      days: ["วัดพระแก้ว ท่าเตียน ล่องเรือข้ามฟากไปวัดอรุณฯ ยามเย็น", "ตลาดน้ำยามเช้า แล้วเดินกินเยาวราช"],
    },
  ];

  const pkgById = Object.fromEntries(packages.map((p) => [p.id, p]));

  /* ---------- Helpers ---------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const baht = (n) => "฿" + n.toLocaleString("th-TH");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const scrollBehavior = () => (reduceMotion.matches ? "auto" : "smooth");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /* Hide broken images over their coloured backdrop instead of showing a broken icon. */
  const guardImg = (img) => {
    img.addEventListener("error", () => img.classList.add("is-missing"), { once: true });
    return img;
  };

  const fromTemplate = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);

  /* ---------- Carousel ---------- */

  const track = $(".carousel__track");
  const dotsWrap = $(".carousel__dots");
  let current = START;

  const slideEls = slides.map((d, i) => {
    const el = fromTemplate("tpl-slide");
    const img = guardImg($(".slide__img", el));
    img.src = IMG + d.img;
    img.alt = d.alt;
    img.style.objectPosition = d.pos;
    if (i !== START) img.loading = "lazy";
    $(".slide__en", el).textContent = d.en;
    $(".slide__th", el).textContent = d.th;
    $(".slide__sub", el).textContent = d.sub;
    el.setAttribute("role", "group");
    el.setAttribute("aria-roledescription", "slide");
    el.setAttribute("aria-label", `${i + 1} จาก ${slides.length}: ${d.th}`);
    el.addEventListener("click", () => {
      if (el.dataset.pos === "center") openDestination(d.id);
      else go(i);
    });
    track.append(el);
    return el;
  });

  const dots = slides.map((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", d.th);
    b.addEventListener("click", () => go(i));
    dotsWrap.append(b);
    return b;
  });

  const live = document.createElement("p");
  live.className = "visually-hidden";
  live.setAttribute("aria-live", "polite");
  $(".carousel").append(live);

  // Page scenery follows the selected destination (Phuket shares the Andaman coast with Krabi)
  const THEME = { krabi: "krabi", phuket: "krabi", bangkok: "bangkok", "chiang-mai": "chiang-mai" };
  const setTheme = (id) => { document.documentElement.dataset.theme = THEME[id] || "krabi"; };
  addEventListener("load", () => document.documentElement.classList.add("scenes-ready"));

  function go(i, announce = true) {
    const n = slides.length;
    current = (i + n) % n;
    setTheme(slides[current].id);
    slideEls.forEach((el, k) => {
      const rel = (k - current + n) % n;
      el.dataset.pos = rel === 0 ? "center" : rel === 1 ? "next" : rel === n - 1 ? "prev" : "hidden";
      el.tabIndex = rel === 0 ? -1 : 0;
      el.setAttribute("aria-hidden", rel === 0 || rel === 1 || rel === n - 1 ? "false" : "true");
    });
    dots.forEach((b, k) => {
      b.setAttribute("aria-selected", String(k === current));
      b.tabIndex = k === current ? 0 : -1;
    });
    if (announce) live.textContent = `${slides[current].th} — สไลด์ ${current + 1} จาก ${n}`;
  }

  $$(".carousel__arrows [data-dir]").forEach((b) =>
    b.addEventListener("click", () => go(current + Number(b.dataset.dir)))
  );

  $(".hero").addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (e.key === "ArrowLeft") { go(current - 1); e.preventDefault(); }
    if (e.key === "ArrowRight") { go(current + 1); e.preventDefault(); }
    if (e.target.closest(".carousel__dots") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) dots[current].focus();
  });
  slideEls.forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); }
    })
  );

  let touchX = null;
  track.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  go(START, false);

  /* ---------- Destination cards ---------- */

  const destGrid = $(".dest-grid");
  const cardById = {};

  destinations.forEach((d, i) => {
    const el = fromTemplate("tpl-dest");
    el.id = "dest-" + d.id;
    el.style.setProperty("--tint", d.tint);
    const img = guardImg($(".dest-card__img", el));
    img.src = IMG + d.img;
    img.alt = d.alt;
    img.style.objectPosition = d.pos;
    $(".dest-card__region", el).textContent = d.regionTh;
    $(".dest-card__num", el).textContent = String(i + 1).padStart(2, "0");
    $(".dest-card__en", el).textContent = d.en;
    const link = $(".dest-card__link", el);
    link.textContent = d.th;
    link.setAttribute("aria-label", `${d.th} — ดูรายละเอียด`);
    link.addEventListener("click", () => openDestination(d.id));
    $(".dest-card__desc", el).textContent = d.desc;
    destGrid.append(el);
    cardById[d.id] = el;
  });

  /* ---------- Package cards ---------- */

  const pkgGrid = $(".pkg-grid");
  packages.forEach((p) => {
    const el = fromTemplate("tpl-pkg");
    el.id = "pkg-" + p.id;
    el.dataset.tone = p.id;
    const img = guardImg($(".pkg-card__media img", el));
    img.src = IMG + p.img;
    img.alt = p.alt;
    $(".pkg-card__badge", el).textContent = p.badge;
    $(".pkg-card__where", el).textContent = p.where;
    $('[data-action="details"]', el).textContent = p.title;
    $(".pkg-card__meta", el).textContent = p.meta.join(" • ");
    $(".pkg-card__price strong", el).textContent = baht(p.price);
    $('[data-action="inquire"]', el).setAttribute("aria-label", `สอบถาม ${p.title}`);
    $('[data-action="details"]', el).addEventListener("click", () => openPackage(p.id));
    $('[data-action="inquire"]', el).addEventListener("click", () => openInquiry(p.id));
    pkgGrid.append(el);
  });

  /* ---------- Sheet dialog ---------- */

  const sheet = $("#sheet");
  const sheetBody = $(".sheet__body", sheet);
  let lastFocus = null;

  function openSheet(html) {
    sheetBody.innerHTML = html;
    $$("img", sheetBody).forEach(guardImg);
    if (!sheet.open) {
      lastFocus = document.activeElement;
      sheet.showModal();
    }
    sheet.scrollTop = 0;
    const title = $("#sheet-title", sheetBody);
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  }

  sheet.addEventListener("close", () => {
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  });
  /* Click on the backdrop closes the dialog. */
  sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });

  const hero = (img, alt) => `<div class="sheet__hero"><img src="${IMG + img}" alt="${esc(alt)}"></div>`;
  const list = (items, tag = "ul") => `<${tag}>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</${tag}>`;

  function openDestination(id) {
    const d = byId[id];
    const slideIdx = slides.indexOf(d);
    if (slideIdx >= 0 && slideIdx !== current) go(slideIdx, false);
    setTheme(id);
    const p = pkgById[d.pkg];
    openSheet(`
      ${hero(d.img, d.alt)}
      <div class="sheet__content">
        <p class="sheet__kicker">${esc(d.en)} · ${esc(d.region)}</p>
        <h2 class="sheet__title" id="sheet-title">${esc(d.th)}</h2>
        <p>${esc(d.desc)}</p>
        <p class="sheet__meta"><span>ภูมิภาค <strong>${esc(d.regionTh)}</strong></span><span>ช่วงที่เหมาะ <strong>${esc(d.best)}</strong></span></p>
        <h3>ไม่ควรพลาด</h3>
        ${list(d.highlights)}
        <div class="sheet__actions">
          <button type="button" class="btn" data-open-pkg="${p.id}">ดูแพ็กเกจ: ${esc(p.title)}</button>
          <button type="button" class="btn btn--ghost" data-inquire="${p.id}">สอบถามทริปนี้</button>
        </div>
      </div>`);
  }

  function openPackage(id) {
    const p = pkgById[id];
    openSheet(`
      ${hero(p.img, p.alt)}
      <div class="sheet__content">
        <p class="sheet__kicker">${esc(p.where)}</p>
        <h2 class="sheet__title" id="sheet-title">${esc(p.title)}</h2>
        <p class="sheet__meta"><span>ระยะเวลา <strong>${esc(p.duration)}</strong></span><span>เริ่มต้น <strong>${baht(p.price)}</strong> / ท่าน</span></p>
        <p>${esc(p.desc)}</p>
        <h3>แผนการเดินทาง</h3>
        <ol>${p.days.map((x, i) => `<li><strong>วันที่ ${i + 1}</strong> — ${esc(x)}</li>`).join("")}</ol>
        <h3>รวมในแพ็กเกจ</h3>
        ${list(p.includes)}
        <p class="form__note">ราคาเป็นราคาตัวอย่างสำหรับการวางแผน ยืนยันราคาและวันเดินทางจริงหลังทีมงานตอบกลับ</p>
        <div class="sheet__actions">
          <button type="button" class="btn" data-inquire="${p.id}">สอบถามแพ็กเกจนี้</button>
        </div>
      </div>`);
  }

  function openInquiry(id) {
    const p = pkgById[id];
    const today = new Date().toISOString().slice(0, 10);
    const options = packages
      .map((x) => `<option value="${x.id}"${x.id === p.id ? " selected" : ""}>${esc(x.title)}</option>`)
      .join("");
    openSheet(`
      <div class="sheet__content">
        <p class="sheet__kicker">Inquiry</p>
        <h2 class="sheet__title" id="sheet-title">สอบถามแพ็กเกจ</h2>
        <p>กรอกข้อมูลแล้วเราจะเปิดอีเมลที่เขียนไว้ให้ คุณตรวจทานแล้วกดส่งเองได้เลย</p>
        <form class="form" id="inquiry" novalidate>
          <label class="field full">แพ็กเกจ
            <select name="pkg">${options}</select>
          </label>
          <label class="field">ชื่อ
            <input name="name" autocomplete="name" required>
            <span class="field__error" aria-live="polite"></span>
          </label>
          <label class="field">อีเมล
            <input name="email" type="email" autocomplete="email" inputmode="email" required>
            <span class="field__error" aria-live="polite"></span>
          </label>
          <label class="field">วันที่อยากเดินทาง
            <input name="date" type="date" min="${today}" required>
            <span class="field__error" aria-live="polite"></span>
          </label>
          <label class="field">จำนวนผู้เดินทาง
            <input name="people" type="number" min="1" max="20" value="2" inputmode="numeric" required>
            <span class="field__error" aria-live="polite"></span>
          </label>
          <label class="field full">ข้อความเพิ่มเติม (ไม่บังคับ)
            <textarea name="note" placeholder="เช่น อยากได้ห้องวิวทะเล หรือมีเด็กเดินทางด้วย"></textarea>
          </label>
          <div class="full sheet__actions">
            <button class="btn" type="submit">เขียนอีเมลสอบถาม</button>
          </div>
          <p class="form__status full" role="status"></p>
          <p class="form__note full">ยังไม่มีการจองหรือชำระเงินในขั้นตอนนี้ หรือติดต่อเราตรงที่ <a href="mailto:${CONTACT}">${CONTACT}</a></p>
        </form>
      </div>`);
    $("#inquiry").addEventListener("submit", submitInquiry);
  }

  const rules = {
    name: (v) => (v.trim() ? "" : "กรุณากรอกชื่อ"),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com"),
    date: (v, f) => (!v ? "กรุณาเลือกวันที่" : v < f.elements.date.min ? "วันที่ต้องไม่ใช่วันที่ผ่านมาแล้ว" : ""),
    people: (v) => (Number.isInteger(+v) && +v >= 1 && +v <= 20 ? "" : "กรุณาระบุ 1–20 ท่าน"),
  };

  function submitInquiry(e) {
    e.preventDefault();
    const f = e.currentTarget;
    let firstBad = null;
    for (const [name, check] of Object.entries(rules)) {
      const input = f.elements[name];
      const msg = check(input.value, f);
      input.setAttribute("aria-invalid", String(!!msg));
      input.parentElement.querySelector(".field__error").textContent = msg;
      if (msg && !firstBad) firstBad = input;
    }
    const status = $(".form__status", f);
    if (firstBad) { status.textContent = ""; firstBad.focus(); return; }

    const p = pkgById[f.elements.pkg.value];
    const v = (n) => f.elements[n].value.trim();
    const body = [
      `แพ็กเกจ: ${p.title} (เริ่มต้น ${baht(p.price)} / ท่าน)`,
      `ชื่อ: ${v("name")}`,
      `อีเมล: ${v("email")}`,
      `วันที่อยากเดินทาง: ${v("date")}`,
      `จำนวนผู้เดินทาง: ${v("people")} ท่าน`,
      v("note") ? `\nข้อความ:\n${v("note")}` : "",
    ].join("\n");
    const href = `mailto:${CONTACT}?subject=${encodeURIComponent("สอบถามแพ็กเกจ: " + p.title)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    status.textContent = `เปิดโปรแกรมอีเมลแล้ว คำขอจะถึงเราเมื่อคุณกดส่งอีเมลนั้น ถ้าไม่มีหน้าต่างอีเมลขึ้นมา ส่งข้อมูลมาที่ ${CONTACT} ได้เลย`;
  }

  sheetBody.addEventListener("click", (e) => {
    const pk = e.target.closest("[data-open-pkg]");
    const iq = e.target.closest("[data-inquire]");
    if (pk) openPackage(pk.dataset.openPkg);
    if (iq) openInquiry(iq.dataset.inquire);
  });

  /* ---------- Navigation ---------- */

  const toggle = $(".nav-toggle");
  const nav = $("#site-nav");
  const setNav = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); toggle.focus(); }
  });

  // Header floats over the hero sky, then turns solid once the page moves
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = $$("[data-nav]", nav);
  const setCurrent = (key) =>
    navLinks.forEach((a) => (a.dataset.nav === key ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));

  const sections = [["top", $(".hero")], ["destinations", $("#destinations")], ["packages", $("#packages")]];
  const visible = new Map();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => visible.set(en.target, en.isIntersecting));
      const hit = sections.find(([, el]) => visible.get(el));
      if (hit) setCurrent(hit[0]);
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach(([, el]) => io.observe(el));

  /* ---------- Search ---------- */

  const form = $(".search");
  const input = $("#search-input");
  const results = $("#search-results");
  const status = $(".search__status");
  let matches = [];
  let active = -1;

  const norm = (s) => s.toLowerCase().replace(/\s+/g, "").replace(/ฯ/g, "");
  const haystack = (d) => norm([d.th, d.en, d.region, d.regionTh, d.id].join(" "));
  const find = (q) => {
    const n = norm(q);
    return n ? destinations.filter((d) => haystack(d).includes(n)) : [];
  };

  function renderResults() {
    results.innerHTML = "";
    matches.forEach((d, i) => {
      const li = document.createElement("li");
      li.id = "opt-" + d.id;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === active));
      li.innerHTML = `${esc(d.th)} <small>${esc(d.en)} · ${esc(d.region)}</small>`;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(d); });
      results.append(li);
    });
    const open = matches.length > 0;
    results.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
    if (active >= 0 && matches[active]) input.setAttribute("aria-activedescendant", "opt-" + matches[active].id);
    else input.removeAttribute("aria-activedescendant");
  }

  const closeResults = () => { matches = []; active = -1; renderResults(); };

  input.addEventListener("input", () => {
    status.textContent = "";
    status.classList.remove("is-error");
    matches = find(input.value);
    active = -1;
    renderResults();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!matches.length) matches = find(input.value);
      if (!matches.length) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      active = (active + step + matches.length) % matches.length;
      renderResults();
    } else if (e.key === "Escape") {
      if (matches.length) { e.stopPropagation(); closeResults(); }
    }
  });

  input.addEventListener("blur", () => setTimeout(closeResults, 0));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pick = matches[active] || find(input.value)[0];
    if (pick) { choose(pick); return; }
    closeResults();
    status.classList.add("is-error");
    status.textContent = input.value.trim()
      ? `ไม่พบ “${input.value.trim()}” ลองค้นหา เชียงใหม่ ภูเก็ต กระบี่ หรือ กรุงเทพฯ`
      : "พิมพ์ชื่อจุดหมายที่อยากไปก่อน";
  });

  function choose(d) {
    input.value = d.th;
    closeResults();
    status.classList.remove("is-error");
    status.textContent = `พบ ${d.th}`;
    setNav(false);
    const slideIdx = slides.indexOf(d);
    if (slideIdx >= 0) go(slideIdx);
    setTheme(d.id);
    const card = cardById[d.id];
    card.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    card.classList.remove("is-found");
    void card.offsetWidth; // restart the highlight animation
    card.classList.add("is-found");
    $(".dest-card__link", card).focus({ preventScroll: true });
  }
})();
