
const { override } = require("customize-cra");

module.exports = override((config, env) => {
  if (env === "production") {
    // Force fixed filenames
    config.output.filename = "editor.js";
    config.output.chunkFilename = "[name].chunk.js";

    config.plugins.forEach((plugin) => {
      if (plugin.constructor.name === "MiniCssExtractPlugin") {
        plugin.options.filename = "editor.css";
        plugin.options.chunkFilename = "[name].chunk.css";
      }
    });
  }
  return config;
});
