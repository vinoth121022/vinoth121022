const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const blenderScript = path.join(appRoot, "scripts", "blender", "render_static_pawn_piece.py");
const blender = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const sourceGlb =
  process.env.PAWN_ANIMATION_GLB || "/Users/sukanyakuttymurugan/Documents/Animation/Pawn_animation.glb";
const resolution = process.env.STATIC_PAWN_RESOLUTION || "512";
const colors = ["w", "b"];

if (!fs.existsSync(blender)) {
  throw new Error(`Blender binary not found: ${blender}`);
}

if (!fs.existsSync(sourceGlb)) {
  throw new Error(`Pawn animation GLB not found: ${sourceGlb}`);
}

for (const color of colors) {
  const out = path.join(appRoot, "src", "assets", `pawn_static_${color}.png`);
  const result = spawnSync(
    blender,
    [
      "--background",
      "--python",
      blenderScript,
      "--",
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
    throw new Error(`Blender static pawn render failed for ${color} with exit code ${result.status}`);
  }

  console.log(`static pawn: ${out}`);
}
