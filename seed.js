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
const chalk = require("chalk");

console.log(
  chalk.bgGreen("Status") + chalk.green.bold(" Initiating Seeding ... \n")
);

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
  console.log(chalk.bgGreen("Fetched Ontology Classes "));

  fromFile(PATH_TO_BPMN_FILE, ROOT).then((response) => {
    console.log(chalk.bgGreen("Fetched BPMN File "));

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

    console.log(chalk.bgGreen("Classfiying BPMN Labels Complete "));

    console.log(chalk.bgGreen("Parsing BPMN File Complete "));

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
      router.get('/${data[i].route}', function(req, res) {
        res.render('pages/${data[i].route}');
      });
    `);
  }

  writeStream.write(`
    module.exports = router;
  `);
  writeStream.end();
  console.log(chalk.bgGreen("Route File Generation Complete "));
  createPages(data);
  console.log(
    chalk.bgGreen("\nStatus") + chalk.green(" Processing Complete!!!\n")
  );
}

function createPages(data) {
  for (let i = 0; i < data.length; i++) {
    fetchDataPropertiesByOntologyClassName(
      capitalizeFirstLetter(data[i].tags[0])
    ).then((res) => {
      let template = "<div class='main-container'>";
      for (let i = 0; i < res.length; i++) {
        template += `<input class="form-control" type="text" placeholder='${res[i]}' /><br/>`;
      }

      template += `<button type="button" class="form-control btn btn-primary">Submit</button></div>`;

      const writeStream = fs.createWriteStream(
        `views/pages/${data[i].route}.ejs`
      );

      const page = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <%- include('../partials/head'); %>
          </head>

          <body class="container">
            <header>
              <%- include('../partials/header'); %>
            </header>
            <main>
              <div class="jumbotron">
                ${template}
              </div>
            </main>
            <footer>
              <%- include('../partials/footer'); %>
            </footer>
          </body>
        </html>
      `;

      writeStream.write(page);
      writeStream.end();
      console.log(
        chalk.bgYellow(`Page - ${data[i].route} Generation Complete`)
      );
    });
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
