import { Home } from "lucide-react-native";

export type ProductModuleId = "admin" | "auth" | "home" | "play" | "premium" | "profile" | "puzzles" | "review" | "social";

export type IconTone = "cobalt" | "emerald" | "gold" | "rose" | "sky" | "slate" | "violet";

export interface ScreenDefinition {
  caption: string;
  icon: typeof Home;
  module: ProductModuleId;
  path: string;
  primary?: boolean;
  rune: string;
  screen: string;
  tone: IconTone;
}
