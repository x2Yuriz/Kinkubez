import { useEffect, useId, useRef, useState } from "react";
import { useMediaQuery, useReducedMotion } from "../hooks";

const smoothstep = (edgeIn: number, edgeOut: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edgeIn) / (edgeOut - edgeIn)));
  return t * t * (3 - 2 * t);
};

function TitleText({
  compact,
  className,
  ghost = false,
}: {
  compact: boolean;
  className?: string;
  ghost?: boolean;
}) {
  const shared = ghost ? { className } : { className, fill: "#f7ead3" };

  if (compact) {
    return (
      <>
        <text {...shared} x="400" y="238" fontSize="138" textAnchor="middle">
          กิน
        </text>
        <text {...shared} x="400" y="438" fontSize="138" textAnchor="middle">
          กับ
        </text>
      </>
    );
  }

  return (
    <text {...shared} x="800" y="330" fontSize="210" textAnchor="middle">
      กินกับ
    </text>
  );
}

export default function CinematicIntro() {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoplayStopRef = useRef<(() => void) | null>(null);
  const reducedMotion = useReducedMotion();
  const compact = useMediaQuery("(max-width: 760px)");
  const [videoEnabled, setVideoEnabled] = useState(false);
  const rawId = useId();
  const clipId = `thai-title-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;

    if (reducedMotion || connection?.saveData === true) {
      setVideoEnabled(false);
      return;
    }

    setVideoEnabled(true);
  }, [reducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoEnabled) return;

    let inView = true;
    const play = () => {
      void video.play().catch(() => {
        /* The poster remains visible when the browser blocks playback. */
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && !document.hidden) play();
        else video.pause();
      },
      { threshold: 0.02 },
    );

    if (wrapperRef.current) observer.observe(wrapperRef.current);

    const onVisibilityChange = () => {
      if (document.hidden) video.pause();
      else if (inView) play();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    play();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      video.pause();
    };
  }, [videoEnabled]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (reducedMotion) {
      if (wrapper) {
        [
          "--progress",
          "--title-opacity",
          "--title-scale",
          "--title-shift",
          "--chrome-opacity",
          "--center-opacity",
          "--backdrop-opacity",
        ].forEach((property) => wrapper.style.removeProperty(property));
      }
      return;
    }

    const stage = stageRef.current;
    if (!wrapper || !stage) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const stageHeight = stage.offsetHeight || window.innerHeight;
      const travel = Math.max(wrapper.offsetHeight - stageHeight, 1);
      const scrolled = Math.min(
        Math.max(-wrapper.getBoundingClientRect().top, 0),
        travel,
      );
      const progress = scrolled / travel;

      // Zoom-through: the masked title grows exponentially so scrolling
      // pushes the camera through the letters, like the reference clip.
      const zoom = Math.pow(9, progress);

      wrapper.style.setProperty("--progress", progress.toFixed(4));
      wrapper.style.setProperty("--title-scale", zoom.toFixed(3));
      wrapper.style.setProperty(
        "--title-opacity",
        (1 - smoothstep(0.66, 0.85, progress)).toFixed(3),
      );
      wrapper.style.setProperty(
        "--title-shift",
        `${(-progress * 2.5).toFixed(2)}vh`,
      );
      wrapper.style.setProperty(
        "--chrome-opacity",
        (1 - smoothstep(0.02, 0.22, progress)).toFixed(3),
      );
      wrapper.style.setProperty(
        "--center-opacity",
        (1 - smoothstep(0.1, 0.3, progress)).toFixed(3),
      );
      wrapper.style.setProperty(
        "--backdrop-opacity",
        (1 - smoothstep(0.25, 0.65, progress)).toFixed(3),
      );
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion, compact]);

  // Autoplay: scrub the same scroll timeline on a clock so the intro plays by
  // itself like the reference clip. The first real scroll (or the skip button)
  // stops the clock and hands control straight back to the user.
  useEffect(() => {
    if (reducedMotion) return;

    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrapper || !stage) return;
    if (window.scrollY > 0) return; // restored position or deep link

    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto"; // clock steps must not be smoothed

    const ENTRY_MS = 1600; // small + dim title grows in (title-reveal keyframes)
    const ZOOM_MS = 2600; // scroll 0 -> 85%: exponential zoom through the glyphs
    const CLOSE_MS = 500; // 85 -> 100%: fade tail to black (shorter dark period)
    const HANDOFF_MS = 1100; // glide from the intro section to the homepage

    let frame = 0;
    let start = 0;
    let lastSet = -1;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onUserScroll);
      root.style.scrollBehavior = previousBehavior;
    };

    function onUserScroll() {
      if (stopped) return;
      // Our own steps land exactly on lastSet; anything else is the user.
      if (Math.abs(window.scrollY - lastSet) > 2) stop();
    }

    const tick = (now: number) => {
      if (stopped) return;
      if (!start) start = now;
      const t = now - start;
      const travel = Math.max(wrapper.offsetHeight - stage.offsetHeight, 1);
      const home = document.getElementById("main")?.offsetTop ?? travel;

      let y: number;
      if (t < ENTRY_MS) {
        y = 0;
      } else if (t < ENTRY_MS + ZOOM_MS) {
        y = 0.85 * travel * ((t - ENTRY_MS) / ZOOM_MS);
      } else if (t < ENTRY_MS + ZOOM_MS + CLOSE_MS) {
        const u = (t - ENTRY_MS - ZOOM_MS) / CLOSE_MS;
        y = (0.85 + 0.15 * u) * travel;
      } else {
        const u = (t - ENTRY_MS - ZOOM_MS - CLOSE_MS) / HANDOFF_MS;
        if (u >= 1) {
          lastSet = home;
          window.scrollTo(0, home);
          stop();
          return;
        }
        y = travel + (home - travel) * (1 - Math.pow(1 - u, 3));
      }

      lastSet = y;
      window.scrollTo(0, y);
      frame = requestAnimationFrame(tick);
    };

    autoplayStopRef.current = stop;
    window.addEventListener("scroll", onUserScroll, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      stop();
      autoplayStopRef.current = null;
    };
  }, [reducedMotion]);

  const skipAnimation = () => {
    // Stop the clock first: otherwise its per-frame scrollTo would swallow
    // the smooth scroll to the homepage.
    autoplayStopRef.current?.();
    const main = document.getElementById("main");
    if (!main) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: main.offsetTop,
      behavior: reduce ? "auto" : "smooth",
    });
    main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
  };

  const viewBox = compact ? "0 0 800 560" : "0 0 1600 460";
  const frameWidth = compact ? 800 : 1600;
  const frameHeight = compact ? 560 : 460;

  return (
    <section
      ref={wrapperRef}
      className={`cinema${reducedMotion ? " cinema--static" : ""}`}
      aria-label="บทนำวิดีโอ กินกับ"
    >
      <div ref={stageRef} className="cinema__stage">
        <div className="cinema__backdrop" aria-hidden="true">
          <span className="cinema__glow cinema__glow--sea" />
          <span className="cinema__glow cinema__glow--sun" />
          <span className="cinema__grain" />
          <span className="cinema__vignette" />
        </div>

        <div className="cinema__top">
          <a
            className="cinema__brand"
            href="#main"
            onClick={(event) => {
              event.preventDefault();
              skipAnimation();
            }}
          >
            กินกับ
            <span>KinKub · TRAVEL TOGETHER</span>
          </a>
          <span className="cinema__volume">VOL. 01 · 2569</span>
          <button className="cinema__skip" type="button" onClick={skipAnimation}>
            ข้ามแอนิเมชัน
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" />
            </svg>
          </button>
        </div>

        <div className="cinema__center">
          <div className="cinema__chrome-fade">
            <p className="cinema__kicker">
              <span />
              BUDDY · LOCAL GUIDES · TRIP PLANS
              <span />
            </p>
          </div>

          <div className="cinema__title-shell">
            <div className="cinema__title-reveal">
              <h1 className="cinema__title" aria-label="กินกับ">
                <svg
                  className="cine-title"
                  viewBox={viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden="true"
                  focusable="false"
                >
                  <defs>
                    <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                      <TitleText compact={compact} className="cine-title__text" />
                    </clipPath>
                  </defs>

                  <TitleText compact={compact} className="cine-title__ghost" ghost />

                  <foreignObject
                    x="0"
                    y="0"
                    width={frameWidth}
                    height={frameHeight}
                    clipPath={`url(#${clipId})`}
                  >
                    <div
                      className="cine-title__media"
                      style={{ width: frameWidth, height: frameHeight }}
                    >
                      {videoEnabled ? (
                        <video
                          ref={videoRef}
                          className="cine-title__video"
                          src="/media/thailand-scroll.mp4"
                          poster="/media/thailand-poster.webp"
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          aria-hidden="true"
                          tabIndex={-1}
                        />
                      ) : (
                        <img
                          className="cine-title__video"
                          src="/media/thailand-poster.webp"
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </foreignObject>
                </svg>
              </h1>
            </div>
          </div>

          <div className="cinema__chrome-fade">
            <p className="cinema__sub">
              หา Buddy หรือไกด์ท้องถิ่น <span>·</span> วางแผนเที่ยวด้วยกัน
            </p>
          </div>
        </div>

        <div className="cinema__bottom">
          <span className="cinema__meta">
            BUDDY GROUPS · 2–3 PEOPLE
            <br />
            LOCAL GUIDES · THAILAND
          </span>

          <span className="cinema__scroll-cue">
            <span>เลื่อนเพื่อเริ่มต้น</span>
            <span className="cinema__scroll-line" aria-hidden="true" />
          </span>

          <span className="cinema__meta cinema__meta--right">
            PLAN · CHAT · CONFIRM
            <br />
            TRAVEL · EAT · REVIEW
          </span>
        </div>

        <span className="cinema__progress" aria-hidden="true" />
      </div>
    </section>
  );
}

