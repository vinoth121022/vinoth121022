import { adminRoutes } from "../modules/admin/routes";
import { homeRoutes } from "../modules/home/routes";
import { playRoutes } from "../modules/play/routes";
import { premiumRoutes } from "../modules/premium/routes";
import { profileRoutes } from "../modules/profile/routes";
import { puzzleRoutes } from "../modules/puzzles/routes";
import { reviewRoutes } from "../modules/review/routes";
import { socialRoutes } from "../modules/social/routes";
import { ScreenDefinition } from "./routeTypes";

export type { IconTone, ProductModuleId, ScreenDefinition } from "./routeTypes";

export const screenDefinitions = [
  ...premiumRoutes,
  ...homeRoutes,
  ...playRoutes,
  ...puzzleRoutes,
  ...reviewRoutes,
  ...socialRoutes,
  ...profileRoutes,
  ...adminRoutes,
] as const satisfies readonly ScreenDefinition[];

export type Screen = (typeof screenDefinitions)[number]["screen"];

export const screens = screenDefinitions.map((definition) => definition.screen) as Screen[];

export const primaryScreens = screenDefinitions.filter((definition) => definition.primary).map((definition) => definition.screen) as Screen[];

export const screenPaths = Object.fromEntries(screenDefinitions.map((definition) => [definition.screen, definition.path])) as Record<Screen, string>;

export const screenMeta = Object.fromEntries(
  screenDefinitions.map((definition) => [
    definition.screen,
    {
      caption: definition.caption,
      icon: definition.icon,
      module: definition.module,
      rune: definition.rune,
      tone: definition.tone,
    },
  ]),
) as Record<Screen, Omit<ScreenDefinition, "path" | "primary" | "screen">>;

export function screenFromPath(pathname = "/"): Screen {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return screenDefinitions.find((definition) => definition.path === normalized)?.screen ?? "Home";
}
