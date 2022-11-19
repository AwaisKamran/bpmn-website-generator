const fs = require("fs");

function readFile(filename) {
  return fs.readFileSync(filename, { encoding: "UTF-8" });
}

module.exports = readFile;
