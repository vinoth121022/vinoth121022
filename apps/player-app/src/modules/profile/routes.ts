import { Crown } from "lucide-react-native";
import { ScreenDefinition } from "../../app-shell/routeTypes";

export const profileRoutes = [
  {
    caption: "Player",
    icon: Crown,
    module: "profile",
    path: "/profile",
    primary: true,
    rune: "♛",
    screen: "Profile",
    tone: "violet",
  },
] as const satisfies readonly ScreenDefinition[];
