import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// One shared ease-out for everything on the page, and one check for Reduce Motion: with it on, nothing animates and content simply shows.
export const EASE = "expo.out";
export const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export { gsap, ScrollTrigger };
