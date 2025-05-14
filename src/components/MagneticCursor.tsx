
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { BanIcon, CircleDotIcon, CirclePlusIcon, CrosshairIcon, DiamondPlusIcon, ScanIcon, TargetIcon } from "lucide-react"

export default function MagneticCursor() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [cursorVariant, setCursorVariant] = useState("default")
    const [targetElement, setTargetElement] = useState<DOMRect | null>(null)
    const [textColor, setTextColor] = useState<string>("black");
    const [cursorType, setCursorType]  = useState<string>("default");
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

                if(target.getAttribute("cursor-color") != null){
                    setTextColor(target.getAttribute("cursor-color")!.toString());
                } else if (target.nodeName == "BUTTON" && (target.getAttribute("role") == null || (target.getAttribute("role") == "tab" && target.getAttribute("aria-selected") == "true"))) {
                    setTextColor("white");
                } else {
                    setTextColor('black');
                }
             
                

                if(target.getAttribute("cursor-type") != null){
                    setCursorType(target.getAttribute("cursor-type")!.toString());
                } else {
                    setCursorType("default");
                }
            } else {
                const close = target.closest(".magnetic-target");
                if (close) {
                    setCursorVariant("hover")
                    const rect = close.getBoundingClientRect()
                    setTargetElement(rect)

               
                    if(close.getAttribute("cursor-color") != null){
                        setTextColor(close.getAttribute("cursor-color")!.toString());
                    } else if (close.nodeName == "BUTTON" && (close.getAttribute("role") == null || (close.getAttribute("role") == "tab" && close.getAttribute("aria-selected") == "true"))) {
                        setTextColor("white");
                    } else {
                        setTextColor('black');
                    }

                    if(close.getAttribute("cursor-type") != null){
                        setCursorType(close.getAttribute("cursor-type")!.toString());
                    } else {
                        setCursorType("default");
                    }
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
            setCursorType("default");
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
            x: mousePosition.x - 8,
            y: mousePosition.y - 8,
            width: 16,
            height: 16,
            transition: {
                type: "spring",
                mass: 0.1,
                stiffness: 200,
                bounce: 0,
            },
        },
        hover: {
            x: mousePosition.x - 8,
            y: mousePosition.y - 8,
            width: 16,
            height: 16,
            transition: {
                type: "spring",
                mass: 0.1,
                stiffness: 200,
                bounce: 0
            },
        },
    }

    const cursorIcon = ()=>{
        switch (cursorType) {
            case "disabled":
                return <BanIcon />;
                break;
            case "button":
                return <CrosshairIcon />;
                break;
            case "area":
                return <ScanIcon className="rotate-45"/>;
                break;
            case "checkbox":
                return <DiamondPlusIcon/>;
                break;
            case "slider":
                return <CirclePlusIcon/>;
                break;
            default:
                return <CircleDotIcon />;
                break;
        }
    }

    return (
        <>
            <motion.div
                className="pointer-events-none fixed left-0 top-0 z-50"
                variants={variants}
                animate={cursorVariant}
            >

                <div className="absolute -left-[1px] -top-[1px] h-[6px] w-[6px]" style={{
                    borderLeft:"solid black 2px"
                }}></div>

                <div className="absolute left-0 -top-[1px] h-[6px] w-[6px]" style={{
                    borderTop:"solid black 2px"
                }}></div>

                <div className="absolute -right-[1px] -top-[1px] h-[6px] w-[6px]" style={{
                    borderRight:"solid black 2px"
                }}></div>

                <div className="absolute right-0 -top-[1px] h-[6px] w-[6px]" style={{
                    borderTop:"solid black 2px"
                }}></div>

                <div className="absolute -left-[1px] -bottom-[1px] h-[6px] w-[6px]" style={{
                    borderLeft:"solid black 2px"
                }}></div>

                <div className="absolute left-0 -bottom-[1px] h-[6px] w-[6px]" style={{
                    borderBottom:"solid black 2px"
                }}></div>

                <div className="absolute -right-[1px] -bottom-[1px] h-[6px] w-[6px]" style={{
                    borderRight:"solid black 2px"
                }}></div>

                <div className="absolute right-0 -bottom-[1px] h-[6px] w-[6px]" style={{
                    borderBottom:"solid black 2px"
                }}></div>


            </motion.div>

            {/* Center dot that follows mouse precisely */}
            <motion.div
                className={`fixed left-0 top-0 flex text-center rounded-full justify-center items-center pointer-events-none z-50 transition-colors`}
                variants={dotVariants}
                animate={cursorVariant}
                style={{
                    color: textColor
                }}
            >
                {cursorIcon()}
            </motion.div>
        </>
    )
}
