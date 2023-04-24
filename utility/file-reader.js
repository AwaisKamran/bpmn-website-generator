const fs = require("fs");

function readFileSync(filename) {
  return fs.readFileSync(filename, { encoding: "UTF-8" });
}

module.exports = readFile;
