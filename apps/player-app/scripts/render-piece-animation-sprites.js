const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const Jimp = require("jimp-compact");

const appRoot = path.resolve(__dirname, "..");
const blenderScript = path.join(appRoot, "scripts", "blender", "render_piece_animation_sprite.py");
const blender = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const sourceRoot =
  process.env.MESHY_PIECE_GLB_DIR || "/Users/sukanyakuttymurugan/Documents/Animation/ChessAlive_Meshy_Pieces/raw";
const frameSize = Number(process.env.PIECE_ANIMATION_FRAME_SIZE || 220);
const frameCount = Number(process.env.PIECE_ANIMATION_FRAME_COUNT || 96);
const spriteColumns = Number(process.env.PIECE_ANIMATION_COLUMNS || 12);
const pieceColors = ["w", "b"];

const pieceConfigs = {
  b: {
    folder: "Meshy_AI_Ivory_Bishop_biped",
    variants: {
      move: ["Walking"],
      capture: ["Running", "Walking"],
      promotion: ["Running", "Walking"],
    },
  },
  n: {
    folder: "Meshy_AI_Golden_Knight_biped",
    variants: {
      move: ["Walking", "FunnyDancing_03"],
      capture: ["Running", "Jumping_Punch", "FunnyDancing_01"],
      promotion: ["Jump_Over_Obstacle_2", "FunnyDancing_02"],
    },
  },
  r: {
    folder: "Meshy_AI_Ivory_Rook_biped",
    variants: {
      move: ["Walking"],
      capture: ["Running", "Walking"],
      promotion: ["Running", "Walking"],
    },
  },
  q: {
    folder: "Meshy_AI_Golden_Queen_biped",
    variants: {
      move: ["Funky_Walk", "Stylish_Walk_inplace"],
      capture: ["Running", "All_Night_Dance"],
      promotion: ["All_Night_Dance", "penguin_walk"],
    },
  },
};

if (!fs.existsSync(blender)) {
  throw new Error(`Blender binary not found: ${blender}`);
}

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Meshy animation folder not found: ${sourceRoot}`);
}

function clipPathFor(folder, animationName) {
  const folderPath = path.join(sourceRoot, folder);
  const files = fs.readdirSync(folderPath).filter((file) => file.endsWith(".glb"));
  const normalized = animationName.toLowerCase();
  const match = files.find((file) => file.toLowerCase().includes(`animation_${normalized}_withskin`));
  if (!match) {
    throw new Error(`Missing ${animationName} clip in ${folderPath}`);
  }
  return path.join(folderPath, match);
}

async function packSprite({ frameDir, color, piece, variant, out }) {
  const frames = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    frames.push(await Jimp.read(path.join(frameDir, `${piece}_${color}_${variant}_${String(frame).padStart(4, "0")}.png`)));
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
  console.log(`piece sprite: ${out}`);
  console.log(`${width}x${height} frames=${frameCount} columns=${spriteColumns}`);
}

async function renderVariant(piece, color, variant, clips) {
  const frameDir = path.join(appRoot, "tmp", `piece-animation-${piece}-${color}-${variant}-frames`);
  const out = path.join(appRoot, "src", "assets", `piece_animation_${color}_${piece}_${variant}_sprite.png`);
  fs.rmSync(frameDir, { force: true, recursive: true });
  fs.mkdirSync(frameDir, { recursive: true });

  const result = spawnSync(
    blender,
    [
      "--background",
      "--python",
      blenderScript,
      "--",
      "--piece",
      piece,
      "--variant",
      variant,
      "--color",
      color,
      "--clips",
      clips.join("|"),
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
    throw new Error(`Blender render failed for ${color}${piece} ${variant} with exit code ${result.status}`);
  }

  await packSprite({ frameDir, color, piece, variant, out });
  fs.rmSync(frameDir, { force: true, recursive: true });
}

(async () => {
  const pieces = (process.env.PIECE_ANIMATION_PIECES || Object.keys(pieceConfigs).join(","))
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);
  const variants = (process.env.PIECE_ANIMATION_VARIANTS || "move,capture,promotion")
    .split(",")
    .map((variant) => variant.trim())
    .filter(Boolean);

  for (const piece of pieces) {
    const config = pieceConfigs[piece];
    if (!config) throw new Error(`Unsupported piece animation config: ${piece}`);
    for (const color of pieceColors) {
      for (const variant of variants) {
        const clipNames = config.variants[variant];
        if (!clipNames) throw new Error(`Unsupported variant for ${piece}: ${variant}`);
        const clips = clipNames.map((name) => clipPathFor(config.folder, name));
        await renderVariant(piece, color, variant, clips);
      }
    }
  }
})();
