
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"

export default function MagneticCursor() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [cursorVariant, setCursorVariant] = useState("default")
    const [targetElement, setTargetElement] = useState<DOMRect | null>(null)
    const [textColor, setTextColor] = useState<string>("black");
    const myTimeout = useRef<any>(null)

    useEffect(() => {
        const mouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: e.clientX,
                y: e.clientY,
            })
        }

        const handleMouseOver = (e: any) => {
            const mouseEvent = e as MouseEvent
            const target = mouseEvent.target as HTMLElement;

            if (target && target.classList && target.classList.contains("magnetic-target")) {
                setCursorVariant("hover")
                const rect = target.getBoundingClientRect()
                setTargetElement(rect)

                myTimeout.current = setTimeout(() => {
                    const bgColor = getComputedStyle(target).backgroundColor;

                    setTextColor(getContrastingColor(bgColor));
                }, 200);
            } else {
                const close = target.closest(".magnetic-target");
                if (close) {
                    setCursorVariant("hover")
                    const rect = close.getBoundingClientRect()
                    setTargetElement(rect)

                    myTimeout.current = setTimeout(() => {
                        const bgColor = getComputedStyle(close).backgroundColor;

                        setTextColor(getContrastingColor(bgColor));
                    }, 200);
                } else {
                    handleMouseOut();
                }
            }
        }

        const handleMouseOut = () => {
            setCursorVariant("default")
            setTargetElement(null);
            if (myTimeout != null) {
                clearTimeout(myTimeout.current);
            }
            setTextColor('black');
        }

        window.addEventListener("mousemove", mouseMove)
        // document.querySelectorAll(".magnetic-target").forEach((element) => {
        //     element.addEventListener("mouseenter", handleMouseOver)
        //     element.addEventListener("mouseleave", handleMouseOut)

        //     element.addEventListener("pointerenter", handleMouseOver)
        //     element.addEventListener("pointerleave", handleMouseOut)
        // })

        const root = document.getElementById("root") as HTMLDivElement;
        root.addEventListener("mouseover", handleMouseOver)
        root.addEventListener("mouseleave", handleMouseOut)

        root.addEventListener("pointerenter", handleMouseOver)
        root.addEventListener("pointerleave", handleMouseOut)

         root.addEventListener("mousedown", handleMouseOver)

        return () => {
            window.removeEventListener("mousemove", mouseMove)
            document.querySelectorAll(".magnetic-target").forEach((element) => {
                element.removeEventListener("mouseenter", handleMouseOver)
                element.removeEventListener("mouseleave", handleMouseOut)

                element.removeEventListener("pointerenter", handleMouseOver)
                element.removeEventListener("pointerleave", handleMouseOut)
            })
        }
    }, [])

    const variants = {
        default: {
            x: mousePosition.x - 12,
            y: mousePosition.y - 12,
            width: 24,
            height: 24,
            transition: {
                type: "spring",
                mass: 0.1,
                stiffness: 200,
                bounce: 0
            },
        },
        hover: {
            x: targetElement ? targetElement.left - 4 : mousePosition.x - 12,
            y: targetElement ? targetElement.top - 4 : mousePosition.y - 12,
            width: targetElement ? targetElement.width + 8 : 24,
            height: targetElement ? targetElement.height + 8 : 24,
            transition: {
                type: "spring",
                mass: 0.3,
                stiffness: 200,
                bounce: 0
            },
        },
    }

    const dotVariants = {
        default: {
            x: mousePosition.x - 3,
            y: mousePosition.y - 3,
            width: 6,
            height: 6,
            transition: {
                type: "spring",
                mass: 0.1,
                stiffness: 200,
                bounce: 0
            },
        },
        hover: {
            x: mousePosition.x - 3,
            y: mousePosition.y - 3,
            width: 6,
            height: 6,
            transition: {
                type: "spring",
                mass: 0.3,
                stiffness: 200,
                bounce: 0
            },
        },
    }

    function getContrastingColor(bgColor: any) {
        if (bgColor.startsWith("oklab(")) {
            const rgb = oklabToRgb(bgColor);
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness > 125 ? "#000" : "#fff";
        } else {
            const rgb = bgColor.match(/\d+/g);
            if (!rgb) return "#000";

            const r = parseInt(rgb[0], 10);
            const g = parseInt(rgb[1], 10);
            const b = parseInt(rgb[2], 10);

            // Calculate brightness
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 125 ? "#000" : "#fff";
        }

    }

    function oklabToRgb(oklabStr: any) {
        const [l, a, b2] = oklabStr.match(/[\d.-]+/g).map(Number);

        // Convert OKLab to linear RGB
        const L = l;
        const A = a;
        const B = b2;

        const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
        const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
        const s_ = L - 0.0894841775 * A - 1.2914855480 * B;

        const l3 = l_ ** 3;
        const m3 = m_ ** 3;
        const s3 = s_ ** 3;

        let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
        let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
        let b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

        // Clamp and convert to 0–255
        r = Math.min(255, Math.max(0, r * 255));
        g = Math.min(255, Math.max(0, g * 255));
        b = Math.min(255, Math.max(0, b * 255));

        return { r, g, b };
    }

    return (
        <>
            <motion.div
                className="pointer-events-none fixed left-0 top-0 z-50 border border-black"
                variants={variants}
                animate={cursorVariant}
            >
                <div className="absolute -left-[1px] -top-[1px] h-[3px] w-[3px] border border-black"></div>
                <div className="absolute -right-[1px] -top-[1px] h-[3px] w-[3px] border border-black"></div>
                <div className="absolute -bottom-[1px] -left-[1px] h-[3px] w-[3px] border border-black"></div>
                <div className="absolute -bottom-[1px] -right-[1px] h-[3px] w-[3px] border border-black"></div>


            </motion.div>

            {/* Center dot that follows mouse precisely */}
            <motion.div
                className={`fixed left-0 top-0 flex text-center rounded-full bg-white border border-black justify-center items-center pointer-events-none z-50 `}
                variants={dotVariants}
                animate={cursorVariant}
            >

            </motion.div>
        </>
    )
}
