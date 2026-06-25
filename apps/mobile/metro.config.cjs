const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const projectRoot = process.env.METRO_PROJECT_ROOT || __dirname;
const workspaceRoot =
  process.env.METRO_WORKSPACE_ROOT || path.resolve(projectRoot, "../..");
const workspacePackages = {
  "@aiphone/contracts": path.resolve(workspaceRoot, "packages/contracts"),
  "@aiphone/lesson-engine": path.resolve(workspaceRoot, "packages/lesson-engine"),
  "@aiphone/realtime-client": path.resolve(workspaceRoot, "packages/realtime-client")
};

function resolveNodeNextSourceImport(context, moduleName, platform) {
  if ((moduleName.startsWith("./") || moduleName.startsWith("../")) && moduleName.endsWith(".js")) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      return context.resolveRequest(context, moduleName, platform);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
}

const config = {
  projectRoot,
  watchFolders: [
    path.resolve(workspaceRoot, "node_modules"),
    path.resolve(projectRoot, "node_modules"),
    ...Object.values(workspacePackages)
  ],
  resolver: {
    extraNodeModules: workspacePackages,
    resolveRequest: resolveNodeNextSourceImport,
    nodeModulesPaths: [
      path.resolve(projectRoot, "node_modules"),
      path.resolve(workspaceRoot, "node_modules")
    ]
  }
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
