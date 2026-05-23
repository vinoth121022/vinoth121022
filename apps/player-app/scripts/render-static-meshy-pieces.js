const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const blenderScript = path.join(appRoot, "scripts", "blender", "render_static_meshy_piece.py");
const blender = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const sourceRoot =
  process.env.MESHY_PIECE_GLB_DIR || "/Users/sukanyakuttymurugan/Documents/Animation/ChessAlive_Meshy_Pieces";
const resolution = process.env.STATIC_MESHY_PIECE_RESOLUTION || "512";

const pieces = [
  ["p", "pawn_static.glb"],
  ["n", "knight_static.glb"],
  ["b", "bishop_static.glb"],
  ["r", "rook_static.glb"],
  ["q", "queen_static.glb"],
  ["k", "king_static.glb"],
];

if (!fs.existsSync(blender)) {
  throw new Error(`Blender binary not found: ${blender}`);
}

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Meshy piece GLB folder not found: ${sourceRoot}`);
}

for (const [piece, fileName] of pieces) {
  const sourceGlb = path.join(sourceRoot, fileName);
  if (!fs.existsSync(sourceGlb)) {
    throw new Error(`Missing Meshy ${piece} GLB: ${sourceGlb}`);
  }

  for (const color of ["w", "b"]) {
    const out = path.join(appRoot, "src", "assets", `piece_static_${color}_${piece}.png`);
    const result = spawnSync(
      blender,
      [
        "--background",
        "--python",
        blenderScript,
        "--",
        "--piece",
        piece,
        "--color",
        color,
        "--glb",
        sourceGlb,
        "--out",
        out,
        "--resolution",
        resolution,
      ],
      { encoding: "utf8", stdio: "inherit" },
    );

    if (result.status !== 0) {
      throw new Error(`Blender Meshy ${color}${piece} render failed with exit code ${result.status}`);
    }

    console.log(`static Meshy piece: ${out}`);
  }
}
