import { useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { showcaseSlides, type ShowcaseSlide } from "../content";

type Props = { onActiveChange: (slide: ShowcaseSlide) => void };

export default function Showcase({ onActiveChange }: Props) {
  const [active, setActive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastWheelAt = useRef(0);
  const suppressClickUntil = useRef(0);
  const total = showcaseSlides.length;

  const goTo = (index: number) => {
    const next = (index + total) % total;
    setActive(next);
    onActiveChange(showcaseSlides[next]);
  };

  const current = showcaseSlides[active];

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    setIsDragging(false);
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    suppressClickUntil.current = Date.now() + 250;
    goTo(active + (deltaX < 0 ? 1 : -1));
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) < 18 && Math.abs(event.deltaY) < 18) return;
    if (Date.now() - lastWheelAt.current < 650) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    lastWheelAt.current = Date.now();
    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    goTo(active + (movement > 0 ? 1 : -1));
  };

  const handleSlideKey = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goTo(index);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(active + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(active - 1);
    }
  };

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

      <div
        className={`showcase__frame${isDragging ? " is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => {
          const start = pointerStart.current;
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) {
            setIsDragging(true);
          }
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStart.current = null; setIsDragging(false); }}
        onWheel={handleWheel}
        aria-describedby="showcase-scroll-hint"
      >
        {showcaseSlides.map((slide, index) => {
          const offset = (index - active + total) % total;
          const position =
            offset === 0 ? "is-center" : offset === 1 ? "is-left" : "is-right";

          return (
            <figure
              className={`showcase__slide ${position}`}
              key={slide.id}
              role="button"
              tabIndex={0}
              aria-label={`แสดงภาพ ${slide.name}`}
              aria-pressed={index === active}
              onClick={() => {
                if (Date.now() < suppressClickUntil.current) return;
                goTo(index);
              }}
              onKeyDown={(event) => handleSlideKey(event, index)}
              onDragStart={(event) => event.preventDefault()}
            >
              <img
                src={slide.image}
                alt={index === active ? slide.alt : ""}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "low"}
                decoding="async"
                style={{ objectPosition: slide.position }}
              />
              <figcaption className="showcase__slide-info">
                <span>{slide.english}</span>
                <strong>{slide.name}</strong>
                <small>{slide.note}</small>
              </figcaption>
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
        <span id="showcase-scroll-hint" className="showcase__scroll-hint">เลื่อนหรือปัดเพื่อดูจุดหมายอื่น</span>
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
