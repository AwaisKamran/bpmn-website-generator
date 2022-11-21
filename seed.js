const SimpleBpmnModdle = require("bpmn-moddle/dist/index.cjs");
const fileReader = require("./utility/file-reader.js");
const posTagger = require("wink-pos-tagger");
const stem = require("wink-porter2-stemmer");
const { camelCase } = require("lodash");
const fs = require("fs");
const classifier = require("./utility/natural-language-proessing/naive-bayes-classifier.js");
const {
  TASK,
  PROCESS,
  ROOT,
  PATH_TO_BPMN_FILE,
} = require("./utility/constants");
const {
  fetchClasses,
  fetchDataPropertiesByOntologyClassName,
} = require("./utility/sparql");

let pageClassification = [];
let routeTokens = [];
let ONTOLOGY_CLASSES = [];

function fromFile(file, root, opts) {
  var contents = fileReader(file);
  return read(contents, root, opts);
}

function read(xml, root, opts) {
  return moddle.fromXML(xml, root, opts);
}

function createModdle(additionalPackages, options) {
  return new SimpleBpmnModdle(additionalPackages, options);
}

const moddle = createModdle();
const tagger = posTagger();

fetchClasses().then((res) => {
  ONTOLOGY_CLASSES = res;

  fromFile(PATH_TO_BPMN_FILE, ROOT).then((response) => {
    const { rootElement } = response;
    const { rootElements: components } = rootElement;
    const [initialProcesses] = filterProcesses(components, PROCESS);
    const flowElements = initialProcesses.flowElements;
    const filteredFlowElements = filterProcesses(flowElements, TASK);
    const taskNames = filteredFlowElements.map((item) => item.name);

    let taggedSentences = [];

    taggedSentences = taskNames.map((item) => {
      pageClassification.push(classifier.predict(item));
      routeTokens.push(item.split(" ").join(""));
      return tagger.tagSentence(item.toLowerCase());
    });

    console.log(taggedSentences);
    const results = consolidateResults(taggedSentences);
    createRouteFiles(results);
  });
});

function filterProcesses(data, type) {
  return data.filter((item) => item.$type === type);
}

function consolidateResults(data) {
  let results = [];
  for (let i = 0; i < data.length; i++) {
    let dataResult = {};
    dataResult.tags = [];
    for (let j = 0; j < data[i].length; j++) {
      if (
        data[i][j].pos == "NN" ||
        data[i][j].pos == "NNS" ||
        data[i][j].pos == "JJ"
      ) {
        dataResult.tags.push(stem(data[i][j].value));
        dataResult.routeType = pageClassification[i];
        dataResult.route = camelCase(routeTokens[i]);
      }
    }
    results.push(dataResult);
  }
  return results;
}

function createRouteFiles(data) {
  const writeStream = fs.createWriteStream(`routes/index.js`);
  writeStream.write(`
    var express = require('express');
    var router = express.Router();
  `);

  for (let i = 0; i < data.length; i++) {
    writeStream.write(`
      app.${data[i].routeType === "listing" ? "get" : "post"}('/${
      data[i].route
    }', function(req, res) {
        res.render('pages/${data[i].route}');
      });
    `);
  }

  writeStream.write(`
    module.exports = router;
  `);
  writeStream.end();
  createPages(data);
}

function createPages(data) {
  for (let i = 0; i < data.length; i++) {
    console.log(data[i].route);
    fetchDataPropertiesByOntologyClassName(
      capitalizeFirstLetter(data[i].tags[0])
    ).then((res) => {
      console.log(res);
    });
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
