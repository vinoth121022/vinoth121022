import { Bot, Swords } from "lucide-react-native";
import { ScreenDefinition } from "../../app-shell/routeTypes";

export const playRoutes = [
  {
    caption: "Arena",
    icon: Swords,
    module: "play",
    path: "/play",
    primary: true,
    rune: "♞",
    screen: "Play",
    tone: "gold",
  },
  {
    caption: "Practice",
    icon: Bot,
    module: "play",
    path: "/bots",
    primary: false,
    rune: "♙",
    screen: "Bots",
    tone: "rose",
  },
] as const satisfies readonly ScreenDefinition[];
