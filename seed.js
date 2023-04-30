const { camelCase, merge, keyBy, values } = require("lodash");
const fs = require("fs");

const {
  fetchClasses,
  fetchDataPropertiesByOntologyClassName,
  fetchIndividualsByOntologyClassName,
  fetchSubClassesByOntologyClassName,
} = require("./utility/sparql");

const xml2js = require("xml2js");
const chalk = require("chalk");
const { LISTING, CATEGORY, GET, POST, ACTION, BASE_LINK } = require("./utility/constants");

require("dotenv").config();

console.log(
  chalk.bgGreen("Status") + chalk.green.bold(" Initiating Seeding ... \n")
);

const parser = new xml2js.Parser();
let ONTOLOGY_CLASSES = [];

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

function consolidateResults(data) {
  for (let i=0; i <data.length; i++) {
    data[i].route = camelCase(data[i].name.split(" ").join(""));
    data[i].routeType = data[i].text.toLowerCase();
    data[i].className = data[i].name.split(" ")[1];
    delete data[i].text;
  }

  for(let i=0; i<data.length; i++){
    if(data[i+1]){
      if(data[i+1].routeType === LISTING) {
        data[i].link = `${BASE_LINK}${data[i+1].route}?id=`;
      }
      else{
        data[i].link = `${BASE_LINK}${data[i+1].route}`;
      }
    }
  }

  return data;
}

function createRouteFiles(data) {
  const writeStream = fs.createWriteStream(`routes/index.js`);
  writeStream.write(`
    var express = require('express');
    var router = express.Router();
    const cors = require("cors");

    const corsOptions = {
      origin:'*'
    }
    
    const app = express();
    app.use(cors(corsOptions)) 
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
  const { routeType, route} = data;
  const writeStream = fs.createWriteStream(`views/pages/${route}.ejs`);
  const ontologyValues = [...Object.values(ONTOLOGY_CLASSES)];
  const ontologyKeys = [...Object.keys(ONTOLOGY_CLASSES)];
  const userTaskEvent = camelCase(data.userTask.name.split(" ").join(""));

  const page = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <%- include('../partials/head'); %>
        <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
        
        <script>
          const ONTOLOGY_ENDPOINT = '${process.env.ECOMMERCE_ONTOLOGY_ENDPOINT}';
          let ontologyKeys = '${ontologyKeys.join(",")}';
          let ontologyValues = '${ontologyValues.join(",")}';
          ontologyKeys = ontologyKeys.split(",");
          ontologyValues = ontologyValues.split(",");
          let routeType = '${routeType}';
          let userTask = '${data.userTask.name}';
          let userTaskEvent = '${userTaskEvent}';
        </script>

        <script>
          function ${userTaskEvent}(item, price){
            let data = JSON.parse(localStorage.getItem('cart'));
            if(!data){
              data = []
            }
            data.push({ name: item, price });
            localStorage.setItem('cart', JSON.stringify(data));

            SnackBar({
              message: 'User Action Executed - ${data.userTask.name}',
              status: "success",
              icon: "plus",
              fixed: true
            });
          }
        </script>

        <%- include('../partials/listing-partials'); %>
      </head>

      <body>
        <header>
          <%- include('../partials/header'); %>
        </header>
        <main>
          <div id="snackbar"></div>
          <div class="jumbotron" id="container">
            <center>
              <div class="loadingio-spinner-spinner-5ok1oyvgq04">
                <div class="ldio-6t9gy4h2dvm">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            </center>
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
}

function createCategoryPage(data) {
  const { className, route, link} = data;

  fetchSubClassesByOntologyClassName(className).then((response) => {
    let template = "<div class='flex-container'>";

    for (let i=0; i <response.length; i++) {
      template += `<a href='${link}${response[i].value}'><div class="category-container box">
          <div class="image-container" class="lozad" style='background-image: url("${response[i].comment}")'></div>
          <div class="category-text">${response[i].value}</div>
        </div></a>`;
    }

    const writeStream = fs.createWriteStream(`views/pages/${route}.ejs`);

    const page = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <%- include('../partials/head'); %>
        </head>
  
        <body>
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
  let template = `<button class='button-back' onclick='history.back()'>
  <span class="material-symbols-outlined back-icon">arrow_back</span> Go Back
  </button>`;
  template += "<div class='main-container'>";

  for (let i = 0; i < res.length; i++) {
    template += `<div class="form-group">`;
    if(i=== 0){
      template += `<label for="exampleInputEmail1">${res[i]}</label>`
    }

    template += `<input class="form-control" type="text" placeholder='Enter Your ${res[i]}' />`;

    if(i===0){
      template += `<small id="emailHelp" class="form-text text-muted">We'll never share your information with anyone else.</small>`;
    }

    template += `</div>`
  }

  template += `<br/><button type="button" class="form-control btn btn-primary">Submit</button></div>`;

  const writeStream = fs.createWriteStream(
    `views/pages/${data.route}.ejs`
  );

  const page = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <%- include('../partials/head'); %>
    </head>

    <body>
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

fetchClasses().then((res) => {
  ONTOLOGY_CLASSES = res;
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

      /* Create Routes */
      createRouteFiles(results);
      createPages(results);
    })
  });
});