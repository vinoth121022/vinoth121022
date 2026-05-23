import { BarChart3 } from "lucide-react-native";
import { ScreenDefinition } from "../../app-shell/routeTypes";

export const reviewRoutes = [
  {
    caption: "Insights",
    icon: BarChart3,
    module: "review",
    path: "/review",
    primary: false,
    rune: "♕",
    screen: "Review",
    tone: "sky",
  },
] as const satisfies readonly ScreenDefinition[];
