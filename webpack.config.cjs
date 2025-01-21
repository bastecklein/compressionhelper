const path = require("path");

module.exports = {
    entry: "./src/compressionworker.js",
    output: {
        filename: "compressionworker.js",
        path: path.resolve(__dirname, "dist")
    }
};