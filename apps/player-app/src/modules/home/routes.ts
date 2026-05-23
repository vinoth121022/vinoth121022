import { Home } from "lucide-react-native";
import { ScreenDefinition } from "../../app-shell/routeTypes";

export const homeRoutes = [
  {
    caption: "Command",
    icon: Home,
    module: "home",
    path: "/",
    primary: true,
    rune: "♔",
    screen: "Home",
    tone: "cobalt",
  },
] as const satisfies readonly ScreenDefinition[];
