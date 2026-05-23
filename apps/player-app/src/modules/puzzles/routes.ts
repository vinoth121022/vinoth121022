import { BookOpen, Target } from "lucide-react-native";
import { ScreenDefinition } from "../../app-shell/routeTypes";

export const puzzleRoutes = [
  {
    caption: "Learn",
    icon: BookOpen,
    module: "puzzles",
    path: "/learn",
    primary: true,
    rune: "♗",
    screen: "Learn",
    tone: "violet",
  },
  {
    caption: "Tactics",
    icon: Target,
    module: "puzzles",
    path: "/puzzles",
    primary: false,
    rune: "♟",
    screen: "Puzzles",
    tone: "violet",
  },
  {
    caption: "Coach",
    icon: BookOpen,
    module: "puzzles",
    path: "/lessons",
    primary: false,
    rune: "♗",
    screen: "Lessons",
    tone: "emerald",
  },
] as const satisfies readonly ScreenDefinition[];
