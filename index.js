const SimpleBpmnModdle = require("bpmn-moddle/dist/index.cjs");
const fs = require("fs");

const path = "fixtures/e-commerce/diagram.bpmn";
const root = "bpmn:Definitions";

function fromFile(file, root, opts) {
  var contents = readFile(file);
  return read(contents, root, opts);
}

function read(xml, root, opts) {
  return moddle.fromXML(xml, root, opts);
}

function createModdle(additionalPackages, options) {
  return new SimpleBpmnModdle(additionalPackages, options);
}

function readFile(filename) {
  return fs.readFileSync(filename, { encoding: "UTF-8" });
}

const moddle = createModdle();
const rootElement = fromFile(path, root).then((response) =>
  console.log(JSON.stringify(response))
);
