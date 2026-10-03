import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

// Three real screens from the app in phone frames, fanned out under the headline. They rise into place on load, float a little, and drift
// apart at different speeds as the page scrolls. The bottom fades into the page so they read as peeking up from below.
const Phone = ({ src, alt, className, style }: { src: string; alt: string; className: string; style?: object }) => (
  <motion.div className={`absolute overflow-hidden rounded-[2.6rem] border-[9px] border-ink bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] ${className}`} style={style}>
    <img src={src} alt={alt} className="block w-full" draggable={false} />
  </motion.div>
);

export function HeroPhones() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yL = useTransform(scrollYProgress, [0, 1], [60, -90]);
  const yC = useTransform(scrollYProgress, [0, 1], [30, -40]);
  const yR = useTransform(scrollYProgress, [0, 1], [90, -130]);
  const rise = (delay: number) => ({ initial: { opacity: 0, y: 120 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1, delay, ease: [0.23, 1, 0.32, 1] as const } });

  return (
    <div ref={ref} className="relative mx-auto mt-16 h-[470px] max-w-5xl sm:h-[640px] md:h-[760px]">
      <motion.div className="absolute left-[3%] top-16 w-[34%] sm:left-[8%] sm:w-[27%]" style={{ y: yL, rotate: -7 }}>
        <motion.div {...rise(0.45)} className="relative"><Phone src="/shots/profile.jpg" alt="The along profile page with a passport cover" className="static" /></motion.div>
      </motion.div>
      <motion.div className="absolute right-[3%] top-24 w-[34%] sm:right-[8%] sm:w-[27%]" style={{ y: yR, rotate: 7 }}>
        <motion.div {...rise(0.6)} className="relative"><Phone src="/shots/stamps.jpg" alt="Travel stamps earned from finished trips" className="static" /></motion.div>
      </motion.div>
      <motion.div className="absolute left-1/2 top-0 z-10 w-[44%] -translate-x-1/2 sm:w-[34%]" style={{ y: yC }}>
        <motion.div {...rise(0.3)} className="relative">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}>
            <Phone src="/shots/home.jpg" alt="The along home screen with a trip tile" className="static" />
          </motion.div>
        </motion.div>
      </motion.div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
