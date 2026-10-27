import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "./theme";

/** Line icons drawn in code (no icon font, nothing to download). 24×24 grid, round caps. */
const PATHS = {
  check: ["M20 6 9 17l-5-5"],
  cross: ["M6 6l12 12M18 6 6 18"],
  arrow: ["M5 12h14M13 6l6 6-6 6"],
  back: ["M19 12H5M11 18l-6-6 6-6"],
  chevron: ["M9 6l6 6-6 6"],
  external: ["M7 17 17 7M8 7h9v9"],
  file: ["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z", "M14 3v6h6"],
  globe: [
    "M3 12h18",
    "M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
  ],
  question: ["M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"],
  info: ["M12 11v6"],
  offline: [
    "M2 2l20 20",
    "M8.5 16.5a5 5 0 0 1 7 0",
    "M5 12.9a10 10 0 0 1 4.2-2.6",
    "M19 12.9a10 10 0 0 0-2.4-1.8",
  ],
  cap: ["M2 9l10-5 10 5-10 5z", "M6 11v5c3 2 9 2 12 0v-5"],
  tools: ["M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"],
  sprout: [
    "M12 21v-9",
    "M12 12c0-4 3-7 8-7 0 5-3 8-8 7z",
    "M12 14c0-3-2.5-5-6-5 0 3.5 2.5 5.5 6 5z",
  ],
  heart: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
} as const;

/** Icons that also draw a circle (outline) or a dot. */
const CIRCLES: Partial<Record<IconName, { r: number; cy?: number }[]>> = {
  globe: [{ r: 9 }],
  question: [{ r: 9 }, { r: 0.7, cy: 17 }],
  info: [{ r: 9 }, { r: 0.7, cy: 7.5 }],
  offline: [{ r: 1, cy: 20 }],
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  color = colors.ink,
  weight = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  weight?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
      {PATHS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {(CIRCLES[name] ?? []).map((c, i) => (
        <Circle key={i} cx={12} cy={c.cy ?? 12} r={c.r} stroke={color} strokeWidth={weight} />
      ))}
    </Svg>
  );
}
