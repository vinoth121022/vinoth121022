const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const Jimp = require("jimp-compact");

const appRoot = path.resolve(__dirname, "..");
const blenderScript = path.join(appRoot, "scripts", "blender", "render_pawn_animation_sprite.py");
const blender = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const sourceGlb = process.env.PAWN_ANIMATION_GLB || "/Users/sukanyakuttymurugan/Documents/Animation/Pawn_animation.glb";
const frameSize = 240;
const frameCount = 192;
const spriteColumns = 16;
const variants = ["move", "capture", "promotion"];
const pieceColors = ["w", "b"];

if (!fs.existsSync(blender)) {
  throw new Error(`Blender binary not found: ${blender}`);
}

if (!fs.existsSync(sourceGlb)) {
  throw new Error(`Pawn animation GLB not found: ${sourceGlb}`);
}

async function packSprite({ frameDir, color, variant, out }) {
  const frames = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    frames.push(await Jimp.read(path.join(frameDir, `pawn_${color}_${variant}_${String(frame).padStart(4, "0")}.png`)));
  }
  const width = frames[0].bitmap.width;
  const height = frames[0].bitmap.height;
  const rows = Math.ceil(frameCount / spriteColumns);
  const sprite = new Jimp(width * spriteColumns, height * rows, 0x00000000);
  frames.forEach((image, index) => {
    const column = index % spriteColumns;
    const row = Math.floor(index / spriteColumns);
    sprite.composite(image, column * width, row * height);
  });
  await sprite.writeAsync(out);
  console.log(`pawn sprite: ${out}`);
  console.log(`${width}x${height} frames=${frameCount} columns=${spriteColumns}`);
}

async function renderVariant(color, variant) {
  const frameDir = path.join(appRoot, "tmp", `pawn-animation-${color}-${variant}-frames`);
  const out = path.join(appRoot, "src", "assets", `pawn_animation_${color}_${variant}_sprite.png`);
  fs.rmSync(frameDir, { force: true, recursive: true });
  fs.mkdirSync(frameDir, { recursive: true });

  const result = spawnSync(
    blender,
    [
      "--background",
      "--python",
      blenderScript,
      "--",
      "--glb",
      sourceGlb,
      "--variant",
      variant,
      "--color",
      color,
      "--out",
      frameDir,
      "--frames",
      String(frameCount),
      "--resolution",
      String(frameSize),
    ],
    { encoding: "utf8", stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error(`Blender render failed for ${color} ${variant} with exit code ${result.status}`);
  }

  await packSprite({ frameDir, color, variant, out });
  fs.rmSync(frameDir, { force: true, recursive: true });
}

(async () => {
  for (const color of pieceColors) {
    for (const variant of variants) {
      await renderVariant(color, variant);
    }
  }
})();
