import React, { useState } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

export interface TooltipItem {
  id: number;
  name: string;
  designation: string;
  image: string;
}

const ROLE_COLORS: Record<string, string> = {
  pm: "from-blue-500 to-cyan-500",
  po: "from-violet-500 to-purple-500",
  architect: "from-amber-500 to-orange-500",
  dev: "from-emerald-500 to-green-500",
  developer: "from-emerald-500 to-green-500",
  qa: "from-rose-500 to-pink-500",
  devops: "from-sky-500 to-indigo-500",
  analyst: "from-teal-500 to-cyan-500",
  sm: "from-fuchsia-500 to-pink-500",
  ux_expert: "from-yellow-500 to-amber-500",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AvatarImage({ item }: { item: TooltipItem }) {
  const [failed, setFailed] = useState(false);
  const gradient = ROLE_COLORS[item.designation] || "from-primary to-primary/70";

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    // handled by parent
  };

  if (failed || !item.image) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full h-12 w-12 border-2 border-background",
          "bg-gradient-to-br text-white font-bold text-sm",
          "group-hover:scale-105 group-hover:z-30 relative transition duration-500",
          gradient
        )}
      >
        {getInitials(item.name)}
      </div>
    );
  }

  return (
    <img
      height={100}
      width={100}
      src={item.image}
      alt={item.name}
      onError={() => setFailed(true)}
      className="object-cover !m-0 !p-0 object-top rounded-full h-12 w-12 border-2 group-hover:scale-105 group-hover:z-30 border-background relative transition duration-500"
    />
  );
}

export function AnimatedTooltip({
  items,
  className,
}: {
  items: TooltipItem[];
  className?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const halfWidth = target.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className={cn("flex items-center", className)}>
      {items.map((item) => (
        <div
          className="-mr-3 relative group"
          key={item.id}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
          onMouseMove={handleMouseMove}
        >
          <AnimatePresence mode="popLayout">
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 260, damping: 10 },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{
                  translateX,
                  rotate,
                  whiteSpace: "nowrap",
                }}
                className="absolute -top-16 -left-1/2 translate-x-1/2 flex text-xs flex-col items-center justify-center rounded-md bg-foreground z-50 shadow-xl px-4 py-2"
              >
                <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent h-px" />
                <div className="absolute left-10 w-[40%] z-30 -bottom-px bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px" />
                <div className="font-bold text-background relative z-30 text-base">
                  {item.name}
                </div>
                <div className="text-muted text-xs">{item.designation}</div>
              </motion.div>
            )}
          </AnimatePresence>
          <AvatarImage item={item} />
        </div>
      ))}
    </div>
  );
}
