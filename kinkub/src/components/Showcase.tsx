import { useState } from "react";
import { showcaseSlides } from "../content";

export default function Showcase() {
  const [active, setActive] = useState(0);
  const total = showcaseSlides.length;

  const goTo = (index: number) => {
    setActive((index + total) % total);
  };

  const current = showcaseSlides[active];

  return (
    <section
      className="showcase"
      aria-labelledby="showcase-heading"
      role="region"
      aria-roledescription="carousel"
      aria-label="ภาพบรรยากาศจุดหมายปลายทาง"
    >
      <h2 id="showcase-heading" className="sr-only">
        ภาพบรรยากาศจากจุดหมายปลายทาง
      </h2>

      <div className="showcase__frame">
        {showcaseSlides.map((slide, index) => {
          const offset = (index - active + total) % total;
          const position =
            offset === 0 ? "is-center" : offset === 1 ? "is-right" : "is-left";

          return (
            <figure
              className={`showcase__slide ${position}`}
              key={slide.id}
              aria-hidden={index !== active}
            >
              <img
                src={slide.image}
                alt={index === active ? slide.alt : ""}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "low"}
                decoding="async"
                style={{ objectPosition: slide.position }}
              />
            </figure>
          );
        })}

        <div className="showcase__caption" aria-live="polite">
          <span className="showcase__count">
            0{active + 1} <i>/</i> 0{total}
          </span>
          <span className="showcase__place">
            <strong>{current.name}</strong>
            <span>{current.english}</span>
          </span>
          <span className="showcase__note">{current.note}</span>
        </div>
      </div>

      <div className="showcase__controls">
        <div className="showcase__dots" role="group" aria-label="เลือกภาพ">
          {showcaseSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={index === active ? "is-active" : ""}
              aria-label={`ดูภาพ ${slide.name}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => goTo(index)}
            >
              <span />
            </button>
          ))}
        </div>

        <div className="showcase__arrows">
          <button
            type="button"
            aria-label="ภาพก่อนหน้า"
            onClick={() => goTo(active - 1)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M17 10H4M9 5l-5 5 5 5" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="ภาพถัดไป"
            onClick={() => goTo(active + 1)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 10h13M11 5l5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
