const SimpleBpmnModdle = require("bpmn-moddle/dist/index.cjs");
const fileReader = require("./utility/file-reader.js");
const posTagger = require("wink-pos-tagger");
const stem = require("wink-porter2-stemmer");
const { camelCase, template } = require("lodash");
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
  fetchIndividualsByOntologyClassName,
  fetchIndividualsPropertiesByOntologyClassName,
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

    if (process.env.MULTI_PAGE === "true") {
      createRouteFiles(results);
    } else {
      createSingleRouteFiles(results);
    }
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
        data[i][j].pos == "JJ" ||
        (process.env.MULTI_PAGE === "false" && data[i][j].pos == "VBG")
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

function createListingPage(data) {
  fetchIndividualsPropertiesByOntologyClassName("Category").then((res) => {
    let template = "<div class='flex-container'>";

    const [features, comments] = res;
    for (let i = 0; i < features.length; i++) {
      template += `<div class="category-container">
          <div class="image-container" style='background-image: url("${comments[i]}")'></div>
          <div class="category-text">${features[i]}</div>
        </div>`;
    }

    const writeStream = fs.createWriteStream(`views/pages/${data.route}.ejs`);

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
    console.log(chalk.bgYellow(`Page - ${data.route} Generation Complete`));
  });
}

function createPages(data) {
  for (let i = 0; i < data.length; i++) {
    fetchDataPropertiesByOntologyClassName(
      capitalizeFirstLetter(data[i].tags[0])
    ).then((res) => {
      let template = "<div class='main-container'>";

      if (data[i].routeType === "listing") {
        createListingPage(data[i]);
      } else {
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
      }
    });
  }
}

function createSingleRouteFiles(data) {
  const writeStream = fs.createWriteStream(`routes/index.js`);
  writeStream.write(`
    var express = require('express');
    var router = express.Router();

    router.get('/generated-page', function(req, res) {
      res.render('pages/generated-page');
    });
  `);

  writeStream.write(`
    module.exports = router;
  `);
  writeStream.end();
  console.log(chalk.bgGreen("Single Route File Generation Complete "));
  createSinglePage(data);
  console.log(
    chalk.bgGreen("\nStatus") + chalk.green(" Processing Complete!!!\n")
  );
}

async function createSinglePage(data) {
  let template = "<div class='main-container'>";

  for (let i = 0; i < data.length; i++) {
    const tags = data[i].tags;

    switch (tags[0]) {
      case "add":
        template += await addPlainFields(tags);
        break;

      case "select":
        template += await addSelectiveFields(tags);
        break;
    }
  }

  template += `<button type="button" class="form-control btn btn-primary">Submit</button></div>`;

  template += "</div>";

  const writeStream = fs.createWriteStream(`views/pages/generated-page.ejs`);

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
  console.log(chalk.bgYellow(`Page - generated-page Generation Complete`));
}

async function addPlainFields(data) {
  data.splice(0, 1);

  let template = "";
  template += `<input class="form-control" type="text" placeholder='${capitalizeFirstLetter(
    data.join(" ")
  )}'/><br/>`;

  return template;
}

async function addSelectiveFields(data) {
  let template = "";
  template += `<select class="form-control" type="text" placeholder='${capitalizeFirstLetter(
    data.join(" ")
  )}'>`;

  await fetchIndividualsByOntologyClassName(
    capitalizeFirstLetter(data[2])
  ).then((response) => {
    for (let i = 0; i < response.length; i++) {
      template += `<option>${response[i]}</option>`;
    }
  });

  template += "</select><br/>";

  return template;
}

function capitalizeFirstLetter(string) {
  return string ? string.charAt(0).toUpperCase() + string.slice(1) : null;
}
