const { camelCase, merge, keyBy, values } = require("lodash");
const fs = require("fs");

const {
  fetchClasses,
  fetchDataPropertiesByOntologyClassName,
  fetchIndividualsByOntologyClassName,
  fetchIndividualsPropertiesByOntologyClassName,
  fetchSubClassesByOntologyClassName
} = require("./utility/sparql");

const xml2js = require("xml2js");
const chalk = require("chalk");
const { LISTING, CATEGORY, GET, POST, ACTION } = require("./utility/constants");

require("dotenv").config();

console.log(
  chalk.bgGreen("Status") + chalk.green.bold(" Initiating Seeding ... \n")
);

const parser = new xml2js.Parser();

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

function refineUserTasks(tasks) {
  const refinedTasks = tasks.map((item) => ({
    id: item.$.id,
    name: item.$.name,
    incoming: item.incoming,
    outgoing: item.outgoing
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

function refineAssociations(tasks) {
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
      const { task, serviceTask, userTask, textAnnotation, association } = process[0];

      /* Refine Tasks */
      const refinedTasks = refineTasks(task);
      const refinedServiceTasks = refineServiceTasks(serviceTask);
      const refinedUserTasks = refineUserTasks(userTask);
      const refinedTextAnnotations = refineTextAnnotations(textAnnotation);
      const refinedAssociations = refineAssociations(association);

      /* Merge Anootation with tasks */
      const updatedTextAnnotations = values(merge(keyBy(refinedTextAnnotations, 'id'), keyBy(refinedAssociations, 'id'))).map((item) => ({ source: item.source, text: item.text }));
      const annotatedTasks = values(merge(keyBy(refinedTasks, 'id'), keyBy(updatedTextAnnotations, 'source'))).map((item) => ({
        id: item.id,
        name: item.name,
        outgoing: item.outgoing,
        text: item.text.split(" ")[0]
      }));

      /* Merge User Tasks with tasks */
      let userTasks = [];
      for (let i = 0; i < refinedUserTasks.length; i++) {
        userTasks[refinedUserTasks[i].incoming[0]] = {
          name: refinedUserTasks[i].name
        }
      }

      for (let i = 0; i < annotatedTasks.length; i++) {
        for (let j = 0; j < annotatedTasks[i].outgoing.length; j++) {
          const flowElement = annotatedTasks[i].outgoing[j];
          if (userTasks[flowElement]) {
            annotatedTasks[i].userTask = {
              ...userTasks[flowElement]
            }
          }
        }
      }

      /* Merge Service Tasks with tasks */
      serviceTasks = [];
      for (let i = 0; i < refinedServiceTasks.length; i++) {
        serviceTasks[refinedServiceTasks[i].incoming[0]] = {
          name: refinedServiceTasks[i].name
        }
      }

      for (let i = 0; i < annotatedTasks.length; i++) {
        for (let j = 0; j < annotatedTasks[i].outgoing.length; j++) {
          const flowElement = annotatedTasks[i].outgoing[j];
          if (serviceTasks[flowElement]) {
            annotatedTasks[i].serviceTask = {
              ...serviceTasks[flowElement],
              type: annotatedTasks[i].text.toLowerCase() === LISTING ? GET : POST
            }
          }
        }
      }

      console.log(chalk.bgGreen("Result Consolidated"));
      const finalTaskList = annotatedTasks.reverse();
      console.log(chalk.bgGreen("Parsing BPMN File Complete "));
      const results = consolidateResults(finalTaskList);


      /* Remove unwanted fields */
      for(let i=0; i<results.length; i++){
        delete results[i].id;
        delete results[i].outgoing;
      }

      console.log(results);

      /* Create Routes */
      createRouteFiles(results);
      createPages(results);
    })
  });
});

function consolidateResults(data) {
  for (let i=0; i <data.length; i++) {
    data[i].route = camelCase(data[i].name.split(" ").join(""));
    data[i].routeType = data[i].text.toLowerCase();
    data[i].className = data[i].name.split(" ")[1];
    delete data[i].text;
  }
  return data;
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
  const { className, route} = data;
  fetchIndividualsPropertiesByOntologyClassName(className).then((res) => {
    let template = "<div class='flex-container'>";

    const [features, comments] = res;
    for (let i = 0; i < features.length; i++) {
      template += `<div class="category-container">
          <div class="image-container" style='background-image: url("${comments[i]}")'></div>
          <div class="category-text">${features[i]}</div>
        </div>`;
    }

    const writeStream = fs.createWriteStream(`views/pages/${route}.ejs`);

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
    console.log(chalk.bgYellow(`Page - ${route} Generation Complete`));
  });
}

function createCategoryPage(data) {
  const { className, route} = data;

  fetchSubClassesByOntologyClassName(className).then((response) => {
    let template = "<div class='flex-container'>";

    for (let i=0; i <response.length; i++) {
      template += `<div class="category-container">
          <div class="image-container" style='background-image: url("${response[i].comment}")'></div>
          <div class="category-text">${response[i].value}</div>
        </div>`;
    }

    const writeStream = fs.createWriteStream(`views/pages/${route}.ejs`);

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
    console.log(chalk.bgYellow(`Page - ${route} Generation Complete`));
  });
}

function createActionPage(res, data) {
  let template = "<div class='main-container'>";

  for (let i = 0; i < res.length; i++) {
    template += `<input class="form-control" type="text" placeholder='${res[i]}' /><br/>`;
  }
  template += `<button type="button" class="form-control btn btn-primary">Submit</button></div>`;

  const writeStream = fs.createWriteStream(
    `views/pages/${data.route}.ejs`
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
}

function createPages(data) {
  for (let i=0; i <data.length; i++) {
    const { route, routeType, className} = data[i];
    fetchDataPropertiesByOntologyClassName(
      capitalizeFirstLetter(className)
    ).then((response) => {
      if(routeType === LISTING)
        createListingPage(data[i])
      else if (routeType === CATEGORY)
       createCategoryPage(data[i])
      else 
        createActionPage(response, data[i])

      console.log(
        chalk.bgYellow(`Page - ${route} Generation Complete`)
      );
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
