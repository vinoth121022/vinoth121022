import { Database, Trophy } from "lucide-react-native";
import { ScreenDefinition } from "../../app-shell/routeTypes";

export const adminRoutes = [
  {
    caption: "Ops",
    icon: Database,
    module: "admin",
    path: "/admin",
    primary: true,
    rune: "DB",
    screen: "Admin",
    tone: "slate",
  },
  {
    caption: "Events",
    icon: Trophy,
    module: "admin",
    path: "/tournaments",
    primary: false,
    rune: "♚",
    screen: "Tournaments",
    tone: "gold",
  },
] as const satisfies readonly ScreenDefinition[];
