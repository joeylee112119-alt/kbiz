const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = {
  projectRoot,
  watchFolders: [
    path.resolve(workspaceRoot, "packages/contracts"),
    path.resolve(workspaceRoot, "packages/lesson-engine"),
    path.resolve(workspaceRoot, "packages/realtime-client")
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, "node_modules"),
      path.resolve(workspaceRoot, "node_modules")
    ]
  }
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
