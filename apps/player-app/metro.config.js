const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.resolver.assetExts = Array.from(new Set([...config.resolver.assetExts, "glb", "gltf"]));
config.watchFolders = [workspaceRoot, path.resolve(workspaceRoot, "packages")];
config.resolver.enableGlobalPackages = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => path.join(workspaceRoot, "node_modules", String(name)),
  },
);

module.exports = config;
