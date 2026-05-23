import { MessageCircle } from "lucide-react-native";
import { ScreenDefinition } from "../../app-shell/routeTypes";

export const socialRoutes = [
  {
    caption: "Lobby",
    icon: MessageCircle,
    module: "social",
    path: "/social",
    primary: true,
    rune: "♘",
    screen: "Social",
    tone: "emerald",
  },
] as const satisfies readonly ScreenDefinition[];
