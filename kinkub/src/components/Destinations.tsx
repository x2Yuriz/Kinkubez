import type { CSSProperties } from "react";
import { destinations } from "../content";

type Props = {
  query: string;
  onClear: () => void;
};

export default function Destinations({ query, onClear }: Props) {
  const normalized = query.trim().toLowerCase();
  const visible = normalized
    ? destinations.filter((destination) =>
        [
          destination.name,
          destination.english,
          destination.region,
          destination.blurb,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
    : destinations;

  return (
    <section className="destinations" id="destinations" aria-labelledby="destinations-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow__line" />
            PLACES TO GO
          </p>
          <h2 id="destinations-heading">สถานที่ที่คุณอยากไป</h2>
        </div>
        <p className="section-heading__note">
          สี่จุดหมาย สี่จังหวะของประเทศไทย
          <br />
          เลือกที่ที่ตรงกับใจคุณ
        </p>
      </div>

      {normalized ? (
        <p className="destinations__result" role="status">
          พบ {visible.length} จุดหมายสำหรับ “{query.trim()}”
        </p>
      ) : null}

      {visible.length ? (
        <div className="destinations__grid">
          {visible.map((destination) => (
            <a
              className="destination-card"
              key={destination.id}
              href={`/login?next=/trips&destination=${encodeURIComponent(destination.id)}`}
              style={{
                "--card-color": destination.color,
                "--card-image": `url(${destination.image})`,
              } as CSSProperties}
            >
              <span className="destination-card__index">{destination.index}</span>
              <span className="destination-card__region">{destination.region}</span>

              <span className="destination-card__content">
                <span className="destination-card__english">{destination.english}</span>
                <span className="destination-card__name">{destination.name}</span>
                <span className="destination-card__blurb">{destination.blurb}</span>
              </span>

              <span className="destination-card__arrow" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M5 15 15 5M6 5h9v9" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="destinations__empty" role="status">
          <p>ไม่พบจุดหมายที่ค้นหา</p>
          <span>ลองค้นหาชื่อจังหวัด ภาค หรือกิจกรรมอีกครั้ง</span>
          <button type="button" className="text-link" onClick={onClear}>
            ดูจุดหมายทั้งหมด
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 10h13M11 5l5 5-5 5" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
