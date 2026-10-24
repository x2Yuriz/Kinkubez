export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="site-footer__watermark" aria-hidden="true">
        กินกับ
      </span>

      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <a className="site-footer__wordmark" href="#main">
            กินกับ
            <span>KinKub · TRAVEL TOGETHER</span>
          </a>
          <p>
            หาเพื่อนร่วมทาง วางแผนเที่ยวด้วยกัน แล้วแวะกินร้านเด็ดระหว่างทาง
          </p>
        </div>

        <nav className="site-footer__nav" aria-label="เมนูท้ายเว็บไซต์">
          <h2>สำรวจ</h2>
          <a href="#main">หน้าแรก</a>
          <a href="#destinations">จุดหมายปลายทาง</a>
          <a href="/login?next=/trips">หา Buddy และไกด์</a>
        </nav>

        <div className="site-footer__contact" id="contact">
          <h2>ติดต่อ</h2>
          <a href="mailto:hello@tiewthai.co">hello@tiewthai.co</a>
          <a href="tel:+6620000000">+66 2 000 0000</a>
          <span>กรุงเทพมหานคร ประเทศไทย</span>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© 2569 KinKub · กินกับ</span>
        <span className="site-footer__credits">
          ภาพและวิดีโอจาก{" "}
          <a href="https://pixabay.com/" target="_blank" rel="noreferrer">
            Pixabay
          </a>
        </span>
        <a className="site-footer__top" href="#main">
          กลับขึ้นด้านบน
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 17V4M5 9l5-5 5 5" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
