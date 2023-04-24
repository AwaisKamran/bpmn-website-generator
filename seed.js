const posTagger = require("wink-pos-tagger");
const stem = require("wink-porter2-stemmer");
const { camelCase, merge, keyBy, values } = require("lodash");
const fs = require("fs");

const {
  fetchClasses,
  fetchDataPropertiesByOntologyClassName,
  fetchIndividualsByOntologyClassName,
  fetchIndividualsPropertiesByOntologyClassName,
} = require("./utility/sparql");

const xml2js = require("xml2js");
const chalk = require("chalk");

require("dotenv").config();

console.log(
  chalk.bgGreen("Status") + chalk.green.bold(" Initiating Seeding ... \n")
);

let pageClassification = [];
let routeTokens = [];
let ONTOLOGY_CLASSES = [];

const parser = new xml2js.Parser();
const tagger = posTagger();

function refineTasks(tasks) {
  const refinedTasks = tasks.map((item) => ({ 
    id: item.$.id, 
    name: item.$.name, 
    outgoing: item.outgoing 
  }));
  return refinedTasks;
}

function refineServiceTasks(tasks) {
  const refinedTasks = tasks.map((item) => ({ 
    id: item.$.id, 
    name: item.$.name, 
    incoming: item.incoming 
  }));
  return refinedTasks;
}

function refineTextAnnotations(tasks) {
  const refinedAnnotations = tasks.map((item) => ({ 
    id: item.$.id, 
    text: item.text[0]
  }));
  return refinedAnnotations;
}

function refineAssociations(tasks){
  const refinedAssociations = tasks.map((item) => ({ 
    id: item.$.targetRef, 
    source: item.$.sourceRef, 
  }));
  return refinedAssociations;
}

fetchClasses().then((res) => {
  ONTOLOGY_CLASSES = res;['']
  console.log(chalk.bgGreen("Fetched Ontology Classes "));

  /* Read file details */
  fs.readFile(process.env.ECOMMERCE, (err, data) => {
    parser.parseString(data, (err, result) => {
      const { definitions } = result;
      const { process } = definitions;
      const { task, serviceTask, textAnnotation, association } = process[0];
      
      /* Refine Tasks */
      const refinedTasks = refineTasks(task);
      const refinedServiceTasks = refineServiceTasks(serviceTask);
      const refinedTextAnnotations = refineTextAnnotations(textAnnotation);
      const refinedAssociations = refineAssociations(association);

      /* Merge Anootation with tasks */
      const updatedTextAnnotations = values(merge(keyBy(refinedTextAnnotations, 'id'), keyBy(refinedAssociations, 'id'))).map((item) => ({ source: item.source, text: item.text }));
      const updatedTasks = values(merge(keyBy(refinedTasks, 'id'), keyBy(updatedTextAnnotations, 'source'))).map((item) => ({
        id: item.id,
        name: item.name,
        outgoing: item.outgoing,
        text: item.text
      }));
      const taskNames = updatedTasks.map((item) => item.name)
      pageClassification = updatedTasks.map((item) => item.text)

      /* Tagging Tokens */
      let taggedSentences = [];
      taggedSentences = taskNames.map((item) => {
        routeTokens.push(item.split(" ").join(""));
        return tagger.tagSentence(item.toLowerCase());
      });

      console.log(chalk.bgGreen("Classfiying BPMN Labels Complete "));
      console.log(chalk.bgGreen("Parsing BPMN File Complete "));

      const results = consolidateResults(taggedSentences);

      /* Create Routes */
      createRouteFiles(results);
      createPages(results);
    })
  });
});

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
        (process.env.MULTI_PAGE == "false" &&
          (data[i][j].pos === "VBN" || data[i][j].pos === "VB"))
      ) {
        dataResult.tags.push(stem(data[i][j].value));
        dataResult.routeType = pageClassification[i].split(" ")[0];
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

      if (data[i].routeType === "Listing") {
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

function addPlainFields(data) {
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
