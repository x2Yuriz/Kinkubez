import { packagePlans } from "../content";

export default function Packages() {
  return (
    <section className="packages" id="packages" aria-labelledby="packages-heading">
      <div className="section-heading section-heading--center">
        <div>
          <p className="eyebrow eyebrow--center">
            <span className="eyebrow__line" />
            SELECTED JOURNEYS
            <span className="eyebrow__line" />
          </p>
          <h2 id="packages-heading">แพ็กเกจที่คัดสรร</h2>
        </div>
        <p className="section-heading__note">
          ทริปเล็ก ๆ ที่ออกแบบมาให้คุณไม่ต้องรีบ
          <br />
          ราคาต่อท่าน รวมที่พักและอาหารเช้า
        </p>
      </div>

      <div className="packages__grid">
        {packagePlans.map((plan) => (
          <article className="package-card" key={plan.id}>
            <div className="package-card__media">
              <img
                src={plan.image}
                alt={plan.alt}
                loading="lazy"
                decoding="async"
              />
              <span className="package-card__tag">{plan.tag}</span>
            </div>

            <div className="package-card__content">
              <span className="package-card__english">{plan.english}</span>
              <h3>{plan.title}</h3>
              <p className="package-card__meta">{plan.meta}</p>

              <div className="package-card__footer">
                <span className="package-card__price">
                  <small>เริ่มต้น</small>
                  <span>
                    ฿{plan.price}
                    <small> / ท่าน</small>
                  </span>
                </span>
                <a className="package-card__link" href="#contact">
                  สอบถามเส้นทาง
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3 10h13M11 5l5 5-5 5" />
                  </svg>
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
