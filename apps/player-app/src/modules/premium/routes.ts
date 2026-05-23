import { Gem } from "lucide-react-native";
import { ScreenDefinition } from "../../app-shell/routeTypes";

export const premiumRoutes = [
  {
    caption: "Plans",
    icon: Gem,
    module: "premium",
    path: "/premium",
    primary: false,
    rune: "₹",
    screen: "Premium",
    tone: "gold",
  },
] as const satisfies readonly ScreenDefinition[];
