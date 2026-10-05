import { useLayoutEffect, useRef } from "react";
import { gsap, reduced } from "../gsap";

// The along logo, huge, filled with travel photos that dissolve into one another. The logo is an SVG mask (it scales to whatever size the box is); the photos sit under it and cross-fade with a slow zoom. Photos are Unsplash images (free to use).
const PHOTOS = ["kerala", "maldives", "himalaya", "bali", "santorini", "goa"];
const HOLD = 3.4, FADE = 1.1;

export function FooterLogo() {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const imgs = gsap.utils.toArray<HTMLElement>("[data-photo]", box.current);
    gsap.set(imgs, { opacity: 0, scale: 1.12 });
    gsap.set(imgs[0], { opacity: 1 });
    const tl = gsap.timeline({ repeat: -1 });
    imgs.forEach((img, i) => {
      const next = imgs[(i + 1) % imgs.length];
      tl.fromTo(img, { scale: 1.12 }, { scale: 1, duration: HOLD + FADE, ease: "none" }, i * HOLD)
        .to(next, { opacity: 1, duration: FADE, ease: "power1.inOut" }, i * HOLD + HOLD)
        .set(img, { opacity: 0 }, i * HOLD + HOLD + FADE);
    });
    tl.set(imgs[0], { opacity: 1 }, imgs.length * HOLD); // loop seam
    // run only while on screen
    const st = gsap.timeline({ scrollTrigger: { trigger: box.current, start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? tl.play() : tl.pause()) } });
    return () => { st.scrollTrigger?.kill(); st.kill(); tl.kill(); };
  }, []);
  return (
    <div role="img" aria-label="along" className="mx-auto w-full max-w-6xl px-5">
      <div ref={box} className="relative w-full overflow-hidden bg-soft" style={{ aspectRatio: "404 / 156", WebkitMaskImage: "url(/footer/logo-mask.svg)", maskImage: "url(/footer/logo-mask.svg)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
        {PHOTOS.map((p, i) => <img key={p} data-photo src={`/footer/${p}.jpg`} alt="" loading={i === 0 ? "eager" : "lazy"} draggable={false} className="absolute inset-0 size-full object-cover" />)}
      </div>
    </div>
  );
}
