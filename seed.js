const { camelCase, merge, keyBy, values, orderBy } = require("lodash");
const fs = require("fs");
const {
  fetchClasses,
  fetchDataPropertiesByOntologyClassName,
  fetchIndividualsByOntologyClassName,
  fetchSubClassesByOntologyClassName,
} = require("./utility/sparql");
const xml2js = require("xml2js");
const chalk = require("chalk");
const { LISTING, CATEGORY, GET, POST, ACTION, BASE_LINK, LOCAL, DATA_TYPES, TASK, ORDER, PASSWORD, TABLE } = require("./utility/constants");
const ONTOLOGY_ENDPOINT = process.env.ECOMMERCE_ONTOLOGY_ENDPOINT; //process.env.ECOMMERCE_ONTOLOGY_ENDPOINT; // process.env.PHARMACY_ONTOLOGY_ENDPOINT;
const PATH_TO_BPMN_FILE = process.env.ECOMMERCE2; //process.env.ECOMMERCE; //process.env.ECOMMERCE2; // process.env.PHARMACY;
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
    outgoing: item.outgoing,
    dataInputAssociation: item.dataInputAssociation,
    dataOutputAssociation: item.dataOutputAssociation
  }));
  return refinedTasks;
}

function refineServiceTasks(tasks) {
  if(tasks && tasks.length){
    const refinedTasks = tasks.map((item) => ({
      id: item.$.id,
      name: item.$.name,
      incoming: item.incoming
    }));
    return refinedTasks;
  }
  else {
    return [];
  }
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

function refineMenuSequenceFlow(tasks) {
  const refinedMenuSequenceFlow = tasks.map((item) => ({
    id: item.$.id,
    name: item.$.name,
    target: item.$.targetRef
  }));
  return refinedMenuSequenceFlow;
}

function refineDataStoreReference(task) {
  const refinedDataStoreData = task.map((item) => ({
    id: item.$.id,
    name: item.$.name,
  }));
  return refinedDataStoreData;
}

function consolidateResults(data) {
  for (let i = 0; i < data.length; i++) {
    data[i].route = camelCase(data[i].name.split(" ").join(""));
    data[i].routeType = data[i].text.toLowerCase();
    data[i].className = data[i].name.split(" ")[1];
    delete data[i].text;
  }

  for (let i = 0; i < data.length; i++) {
    if (data[i + 1]) {
      if (data[i + 1].routeType === LISTING) {
        data[i].link = `${BASE_LINK}${data[i + 1].route}?id=`;
      }
      else {
        data[i].link = `${BASE_LINK}${data[i + 1].route}`;
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
    if (i === 0) {
      writeStream.write(`
        router.get('/', function(req, res) {
          res.render('pages/${data[i].route}');
        });
      `);
    }

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

function createListingPage(data, configuration, index) {
  const { routeType, route, link } = data;

  const writeStream = fs.createWriteStream(`views/pages/${route}.ejs`);
  const ontologyValues = [...Object.values(ONTOLOGY_CLASSES)];
  const ontologyKeys = [...Object.keys(ONTOLOGY_CLASSES)];
  const userTaskEvent = camelCase(data.userTask.name.split(" ").join(""));

  const page = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <%- include('../partials/head'); %>
        <script>
          let style = '${configuration.style}';
          let title = '${configuration.title}';
          document.title = title;
        </script>
        <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"></script>
        
        <script>
          const ONTOLOGY_ENDPOINT = '${ONTOLOGY_ENDPOINT}';
          let ontologyKeys = '${ontologyKeys.join(",")}';
          let ontologyValues = '${ontologyValues.join(",")}';
          ontologyKeys = ontologyKeys.split(",");
          ontologyValues = ontologyValues.split(",");

          let index = ${index};
          let taskName = '${data.name}';
          let taskNameObject = '${data.name.split(" ")[1]}'
          let dataInputSource = '${data?.dataInputAssociation?.type}';
          let dataOutputSource = '${data?.dataOutputAssociation?.type}';
          let routeType = '${routeType}';
          let userTask = '${data.userTask.name}';
          let userTaskEvent = '${userTaskEvent}';
          let link = '${link}';
        </script>

        <script>
          function ${userTaskEvent}(item, price, picture){
            if(item && price && picture && dataInputSource !== "local" && dataOutputSource === "local"){
              let data = JSON.parse(localStorage.getItem('cart'));
              if(!data){
                data = []
              }
              data.push({ name: item, price: parseInt(price.split(" ")[1]), picture });
              localStorage.setItem('cart', JSON.stringify(data));
  
              SnackBar({
                message: 'User Action Executed - ${data.userTask.name}',
                status: "success",
                icon: "plus",
                fixed: true
              });
            }
            else{ 
              window.location.href = link;
            }
          }

          function removeItem(name){
            let data = JSON.parse(localStorage.getItem('cart'));
            const index = data.map(item => item.name).indexOf(name);

            if(index >= 0){
              data.splice(index, 1);
              localStorage.setItem('cart', JSON.stringify(data));

              SnackBar({
                message: 'User Action Executed - Remove',
                status: "danger",
                icon: "danger",
                fixed: true
              });
              fetchData();
            }
          }
        </script>

        <%- include('../partials/listing-partials'); %>
      </head>

      <body>
        <header>
          <%- include('../partials/header'); %>
          <script>
            document.getElementById("anchor-heading").innerHTML = title;
          </script>
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
}

function createOrderPage(data, configuration) {
  const { routeType, route, link } = data;

  const writeStream = fs.createWriteStream(`views/pages/${route}.ejs`);
  const ontologyValues = [...Object.values(ONTOLOGY_CLASSES)];
  const ontologyKeys = [...Object.keys(ONTOLOGY_CLASSES)];
  const userTaskEvent = camelCase(data.userTask.name.split(" ").join(""));

  const page = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <%- include('../partials/head'); %>
        <script>
          let style = '${configuration.style}';
          let title = '${configuration.title}';
          document.title = title;
          document.getElementById("anchor-heading").innerHTML = title;
        </script>
        <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"></script>
        
        <script>
          localStorage.removeItem("Credential");
          const ONTOLOGY_ENDPOINT = '${ONTOLOGY_ENDPOINT}';
          let ontologyKeys = '${ontologyKeys.join(",")}';
          let ontologyValues = '${ontologyValues.join(",")}';
          ontologyKeys = ontologyKeys.split(",");
          ontologyValues = ontologyValues.split(",");

          let taskName = '${data.name}';
          let taskNameObject = '${data.name.split(" ")[1].toLowerCase()}'
          let dataInputSource = '${data?.dataInputAssociation?.type}';
          let dataOutputSource = '${data?.dataOutputAssociation?.type}';
          let routeType = '${routeType}';
          let userTask = '${data.userTask.name}';
          let userTaskEvent = '${userTaskEvent}';
          let link = '${link}';

          function ${userTaskEvent}(flag){
            if(flag){
              fetchData(flag);
            }

            SnackBar({
              message: 'User Action Executed - ${data.userTask.name}',
              status: "info",
              icon: "plus",
              fixed: true
            });
          }
        </script>

        <%- include('../partials/order-partials'); %>
      </head>

      <body>
        <header>
          <%- include('../partials/header'); %>
          <script>
            document.getElementById("anchor-heading").innerHTML = title;
          </script>
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
}

function createCategoryPage(data, configuration) {
  const { className, route, link } = data;

  fetchSubClassesByOntologyClassName(className).then((response) => {
    let template = "<div class='flex-container'>";

    for (let i = 0; i < response.length; i++) {
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
          <script>
            let style = '${configuration.style}';
            let title = '${configuration.title}';
            document.title = title;
            document.getElementById("anchor-heading").innerHTML = title;
          </script>

          <script>
            var images = [];
            function preload() {
                for (var i = 0; i < arguments.length; i++) {
                    images[i] = new Image();
                    images[i].src = preload.arguments[i];
                }
            }
            
            preload(
                "hhttps://media-cldnry.s-nbcnews.com/image/upload/newscms/2023_12/3599096/230320-toothpaste-kb-2x1.jpg",
                "https://hips.hearstapps.com/hmg-prod/images/gettyimages-904676768-1654020745.png",
                "https://roadmap-tech.com/wp-content/uploads/2013/12/AdobeStock_170805293.jpeg"
            )
          </script>
        </head>
  
        <body>
          <header>
            <%- include('../partials/header'); %>
            <script>
              document.getElementById("anchor-heading").innerHTML = title;
            </script>
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

function createTablePage(data, configuration){
  const { className, route, link } = data;
  const writeStream = fs.createWriteStream(`views/pages/${route}.ejs`);

  const page = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <%- include('../partials/head'); %>
        <script>
          let style = '${configuration.style}';
          let title = '${configuration.title}';
          document.title = title;
          if(document.getElementById("anchor-heading")){
            document.getElementById("anchor-heading").innerHTML = title;
          }
        </script>
        <style>
          table {
            font-family: arial, sans-serif;
            border-collapse: collapse;
            width: 100%;
          }

          td, th {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
          }

          tr {
            background-color: white;
          }
        </style>
      </head>

      <body>
        <header>
          <%- include('../partials/header'); %>
          <script>
            document.getElementById("anchor-heading").innerHTML = title;
          </script>
        </header>
        <main>

        <div class="jumbotron" id="tableData">
        </div>

        <script>
          function navigate(){
            const enteries = JSON.parse(localStorage.getItem("Order"));
            for(let i=0; i<enteries.length; i++){
              const data = enteries[i];
              for(let j=0; j<data.length; j++){
                const heading = enteries[i][0];
                const detail = JSON.parse(enteries[i][1])
                if(heading === "cart"){
                  console.log(detail);
                  localStorage.setItem("cart", JSON.stringify(detail));
                }
              }
            }
            window.location.href = '${link}';
          }

          let tableData = [];
          let tableDataKeys = [];

          const orderData = JSON.parse(localStorage.getItem('${className}'));
          for(let i=0; i<orderData.length; i++){
            tableDataKeys.push(orderData[i][0])
            tableData.push({
              ...JSON.parse(orderData[i][1])
            })
          }

          let tableHeaderData = "";
          for(let i=0; i<tableDataKeys.length; i++){
            if(tableDataKeys[i] !== "cart"){
              tableHeaderData += "<th>";
              tableHeaderData += tableDataKeys[i];
              tableHeaderData += "</th>";
            }
          }
          tableHeaderData += "<th></th>"

          let template = "<table>";
          template += tableHeaderData;
          template += "<tr>";

          for(let i=0; i<tableData.length; i++){
            if(tableDataKeys[i] !== "cart"){
              const keys = Object.keys(tableData[i]);
              const values = Object.values(tableData[i]);

              let rowData = "";
              rowData += "<td>";
              for(let j=0; j<keys.length; j++){
                rowData += "" + keys[j] + " - " + values[j] + "<br/>";
              }
              rowData += "</td>";
              template += rowData;
            }

          }
          template += "<td><input onClick='navigate()' type='button' value='View' /></td>"
          template += "</tr>"
          template += "</table>"
          document.getElementById("tableData").innerHTML = template;
        </script>

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

async function createActionPage(res, data, configuration, index) {
  res = orderBy(res, ['sequence'], ['asc']);
  const { name, className, dataOutputAssociation, link, route, routeType, userTask } = data;

  let template = "";
  if(index !== 0){
    template = `<button class='button-back' onclick='history.back()'>
    <span class="material-symbols-outlined back-icon">arrow_back</span> Go Back
    </button>`;
  }

  template += `
    <div class='main-container'>
    <div class='quantity-heading'>${name}</div>
    <form name="form" onsubmit="return false">
  `;

  for (let i = 0; i < res.length; i++) {
    if (res[i].class) {
      template += await addSelectiveFields(res[i].class);
    }
    else {
      template += `<div class="form-group">`;
      if (i === 0 || res[i].range === DATA_TYPES.dateTime) {
        template += `<label for="exampleInputEmail1">${res[i].label}</label>`
      }
      template += `<input class="form-control" name="${res[i].label}" type="${res[i].sensitivity? PASSWORD: res[i].range}" onKeyup="checkform()" placeholder='Enter Your ${res[i].label}' required />`;
      if (i === 0) {
        template += `<small id="emailHelp" class="form-text text-muted">We'll never share your information with anyone else.</small>`;
      }
      template += `</div>`
    }
  }

  template += `
    <br/>
      
    <input id="submitbutton" type="submit" disabled="disabled" onClick="${route}(this)" class="form-control btn btn-${configuration.style}" value="${userTask.name}" />
    </form>
    </div>`;

  const writeStream = fs.createWriteStream(
    `views/pages/${data.route}.ejs`
  );

  const page = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <%- include('../partials/head'); %>
      <script>
        let style = '${configuration.style}';
        let title = '${configuration.title}';
        document.title = title;
        document.getElementById("anchor-heading").innerHTML = title;
      </script>

      <script>
        let routeType = '${routeType}';
        let userTask = '${userTask.name}';
        let dataOutputAssociation = '${dataOutputAssociation?.type}'

        function ${route}(event){
          const form = document.querySelector('form');
          const data = Object.fromEntries(new FormData(form).entries());
          if(routeType === '${ACTION}' && userTask !== 'undefined' &&  dataOutputAssociation === '${LOCAL}'){
            localStorage.removeItem("${className}");
            localStorage.setItem("${className}", JSON.stringify(data))
            window.location.href = '${link}';
          }
          return false;
        }

        function checkform(){
          var form = document.forms["form"].elements;
          var cansubmit = true;
          for (let i=0; i <form.length; i++) {
              if (form[i].value.length == 0) cansubmit = false;
          }

          if (cansubmit) {
            document.getElementById('submitbutton').disabled = !cansubmit;
          }
        }
      </script>
    </head>

    <body>
      <header>
        <%- include('../partials/header'); %>
        <script>
          document.getElementById("anchor-heading").innerHTML = title;
        </script>
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

async function createPages(data) {

  const configurationsClass = "Configuration";
  let configurations = await fetchIndividualsByOntologyClassName(configurationsClass).then((response) => {
    return response;
  });

  let configurationData = {};
  for (let i = 0; i < configurations.length; i++) {
    const values = configurations[i].split(":");
    configurationData[values[0]] = values[1];
  }

  for (let i = 0; i < data.length; i++) {
    const { route, routeType, className } = data[i];
    fetchDataPropertiesByOntologyClassName(
      capitalizeFirstLetter(className)
    ).then((response) => {
      if (routeType === LISTING)
        createListingPage(data[i], configurationData, i)
      else if (routeType === CATEGORY)
        createCategoryPage(data[i], configurationData)
      else if (routeType === ORDER)
        createOrderPage(data[i], configurationData)
      else if (routeType === TABLE)
        createTablePage(data[i], configurationData)
      else
        createActionPage(response, data[i], configurationData, i)

      console.log(
        chalk.bgYellow(`Page - ${route} Generation Complete`)
      );
    });
  }
}

function createMenuHeaderItems(data) {
  const writeStream = fs.createWriteStream(
    `views/partials/menu-header-partials.ejs`
  );

  let template = "";
  for (let i = 0; i < data.length; i++) {
    template += `
      <a class="header-link" href="${data[i].link}">
        <span class="material-symbols-outlined head-icon">
          shopping_cart
        </span>
      </a>
    `;
  }

  const page = `
    <div class="account">
    <span class="icon material-symbols-outlined head-icon">
      account_circle
    </span>
    ${template}
    </div> 
  `;

  writeStream.write(page);
  writeStream.end();
}

async function addSelectiveFields(name) {
  let template = "";
  template += `<select onChange="checkform()" class="form-control" name="${name}" type="text" placeholder='Select ${name}'>`;
  template += `<option disabled selected>Select ${name}</option>`

  await fetchIndividualsByOntologyClassName(name)
    .then((response) => {
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
  fs.readFile(PATH_TO_BPMN_FILE, (err, data) => {
    parser.parseString(data, (err, result) => {
      const { definitions } = result;
      const { process } = definitions;
      const { task, serviceTask, userTask, startEvent, endEvent, textAnnotation, association, sequenceFlow, dataStoreReference } = process[0];

      /* Refine Sequence Flow */
      let sequenceFlowTasks = [];
      let start = [startEvent[0].outgoing[0]];
      let pool = [...task, ...endEvent];

      while (start !== null) {
        for (let i=0; i <pool.length; i++) {
          const data = pool[i];
          for (let j=0; j < data.incoming.length; j++) {
            for (let k=0; k < start.length; k++) {
              if (data.incoming[j] === start[k]) {
                sequenceFlowTasks.push({
                  ...data
                });

                if (data.outgoing && data.outgoing.length)
                  start = data.outgoing;
                else
                  start = null;
                
                break;
              }
            }
          }
        }
      }
      sequenceFlowTasks.splice(sequenceFlowTasks.length-1, 1);

      /* Refine Tasks */
      const refinedTasks = refineTasks(sequenceFlowTasks);
      const refinedServiceTasks = refineServiceTasks(serviceTask);
      const refinedUserTasks = refineUserTasks(userTask);
      const refinedTextAnnotations = refineTextAnnotations(textAnnotation);
      const refinedAssociations = refineAssociations(association);
      const refinedDataStoreReference = refineDataStoreReference(dataStoreReference);
      let refinedMenuSequenceFlow = refineMenuSequenceFlow(sequenceFlow);
      refinedMenuSequenceFlow = refinedMenuSequenceFlow.filter((item) => item.name);

      /* Format DataStore */
      let dataStore = [];
      for (let i = 0; i < refinedDataStoreReference.length; i++) {
        dataStore[refinedDataStoreReference[i].id] = {
          name: refinedDataStoreReference[i].name
        }
      }

      /* Merge Annotation with tasks */
      const updatedTextAnnotations = values(merge(keyBy(refinedTextAnnotations, 'id'), keyBy(refinedAssociations, 'id'))).map((item) => ({ source: item.source, text: item.text }));

      let annotatedTasks = values(merge(keyBy(refinedTasks, 'id'), keyBy(updatedTextAnnotations, 'source'))).map((item) => ({
        id: item.id,
        name: item.name,
        outgoing: item.outgoing,
        dataInputAssociation: item.dataInputAssociation?.map((item) => ({
          id: item.$.id,
          source: item.sourceRef,
        })),
        dataOutputAssociation: item.dataOutputAssociation?.map((item) => ({
          id: item.$.id,
          target: item.targetRef,
        })),
        text: item.text.split(" ")[0]
      }));

      /* Add Data Store Input Type */
      for (let i = 0; i < annotatedTasks.length; i++) {
        if (annotatedTasks[i].dataInputAssociation) {
          for (let j = 0; j < annotatedTasks[i].dataInputAssociation.length; j++) {
            const id = annotatedTasks[i].dataInputAssociation[j].source;
            annotatedTasks[i].dataInputAssociation[j].type = dataStore[id]?.name;
            delete annotatedTasks[i].dataInputAssociation[j].source;
          }
        }
      }

      for (let i = 0; i < annotatedTasks.length; i++) {
        if (annotatedTasks[i].dataInputAssociation) {
          annotatedTasks[i].dataInputAssociation = annotatedTasks[i].dataInputAssociation[0]
        }
        else {
          delete annotatedTasks[i].dataInputAssociation;
        }
      }

      /* Add Data Store Output Type */
      for (let i = 0; i < annotatedTasks.length; i++) {
        if (annotatedTasks[i].dataOutputAssociation) {
          for (let j = 0; j < annotatedTasks[i].dataOutputAssociation.length; j++) {
            const id = annotatedTasks[i].dataOutputAssociation[j].target[0];
            annotatedTasks[i].dataOutputAssociation[j].type = dataStore[id]?.name;
            delete annotatedTasks[i].dataOutputAssociation[j].target;
          }
        }
      }

      for (let i = 0; i < annotatedTasks.length; i++) {
        if (annotatedTasks[i].dataOutputAssociation) {
          annotatedTasks[i].dataOutputAssociation = annotatedTasks[i].dataOutputAssociation[0]
        }
        else {
          delete annotatedTasks[i].dataOutputAssociation;
        }
      }

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

      const finalTaskList = annotatedTasks;
      const results = consolidateResults(finalTaskList);
      console.log(chalk.bgGreen("Result Consolidated"));

      /* Merge Menu Items with tasks */
      let menuItems = [];
      for (let i = 0; i < refinedMenuSequenceFlow.length; i++) {
        menuItems[refinedMenuSequenceFlow[i].id] = {
          name: refinedMenuSequenceFlow[i].name,
          target: refinedMenuSequenceFlow[i].target
        }
      }

      let taskIds = results.map((item) => item.id)

      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].outgoing.length; j++) {
          const flowElement = results[i].outgoing[j];
          if (menuItems[flowElement]) {
            results[i].menuItem = {
              ...menuItems[flowElement],
              link: results[taskIds.indexOf(results[i].id)]?.link
            }
          }
        }
      }
      menuItems = results.map((item) => (item.menuItem)).filter((item) => item);
      console.log(chalk.bgGreen("Parsing BPMN File Complete "));


      /* Remove unwanted fields */
      for (let i = 0; i < results.length; i++) {
        delete results[i].id;
        delete results[i].outgoing;
      }

      /* Create Routes */
      createRouteFiles(results);
      createMenuHeaderItems(menuItems);
      createPages(results);
    })
  });
});