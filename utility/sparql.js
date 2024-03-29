const axios = require("axios");
require("dotenv").config();
const { DATA_TYPES } = require("./constants");

let ONTOLOGY_CLASSES = [];

const ONTOLOGY_ENDPOINT = process.env.PHARMACY_ONTOLOGY_ENDPOINT; //process.env.PHARMACY_ONTOLOGY_ENDPOINT; //process.env.ECOMMERCE_ONTOLOGY_ENDPOINT;

const axiosConfig = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    "Access-Control-Allow-Origin": "*",
  },
};

function fetchClasses() {
  const postData = {
    query: `
      PREFIX owl: <http://www.w3.org/2002/07/owl#> 
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>  
      
      SELECT DISTINCT ?class ?label ?description 
      WHERE {   
        ?class a owl:Class.   
        OPTIONAL { ?class rdfs:label ?label}   
        OPTIONAL { ?class rdfs:comment ?description} 
      } 
      
      LIMIT 25`,
  };

  return axios
    .post(ONTOLOGY_ENDPOINT, postData, axiosConfig)
    .then(function (response) {
      const { results } = response.data;
      const { bindings } = results;

      for (let i = 0; i < bindings.length; i++) {
        ONTOLOGY_CLASSES[bindings[i].label.value] = bindings[i].class.value;
      }

      return ONTOLOGY_CLASSES;
    })
    .catch(function (error) {
      console.log(error);
      return error;
    });
}

function fetchIndividualsPropertiesByOntologyClassName(ontologyName) {
  const postData = {
    query: `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT DISTINCT ?individual ?label ?comment
      WHERE {
        ?individual rdf:type <${ONTOLOGY_CLASSES[ontologyName]}>.
        OPTIONAL {?individual rdf:type owl:NamedIndividual}
        OPTIONAL {?individual rdfs:label ?label}
        OPTIONAL {?individual rdfs:comment ?comment}
      }
    `,
  };

  return axios
    .post(ONTOLOGY_ENDPOINT, postData, axiosConfig)
    .then(function (response) {
      let features = [];
      let comments = [];

      const { results } = response.data;
      const { bindings } = results;

      for (let i = 0; i < bindings.length; i++) {
        features.push(bindings[i].label.value);
        comments.push(bindings[i].comment.value);
      }

      return [features, comments];
    })
    .catch(function (error) {
      console.log(error);
      return error;
    });
}

function fetchIndividualsByOntologyClassName(ontologyName) {
  const postData = {
    query: `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT DISTINCT ?individual ?label
      WHERE {
        ?individual rdf:type <${ONTOLOGY_CLASSES[ontologyName]}>.
        OPTIONAL {?individual rdf:type owl:NamedIndividual}
        OPTIONAL {?individual rdfs:label ?label}
      }
      LIMIT 25
    `,
  };

  return axios
    .post(ONTOLOGY_ENDPOINT, postData, axiosConfig)
    .then(function (response) {
      let features = [];
      const { results } = response.data;
      const { bindings } = results;

      for (let i = 0; i < bindings.length; i++) {
        features.push(bindings[i].label.value);
      }

      return features;
    })
    .catch(function (error) {
      console.log(error);
      return error;
    });
}

function fetchDataPropertiesByOntologyClassName(ontologyName) {
  const postData = {
    query: `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> 
      PREFIX owl: <http://www.w3.org/2002/07/owl#> 
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
      
      SELECT DISTINCT ?class ?label ?range ?value ?sequence ?comment
      WHERE { 
        ?class rdfs:domain <${ONTOLOGY_CLASSES[ontologyName]}> . 
        ?class rdf:type owl:DatatypeProperty. 
        OPTIONAL { ?class rdfs:label ?label} 
        OPTIONAL { ?class rdfs:range ?range}  
        OPTIONAL { ?class rdfs:isDefinedBy ?value} 
        OPTIONAL { ?class rdfs:seeAlso ?sequence}
        OPTIONAL { ?class rdfs:comment ?comment}  
      } 
        
      LIMIT 25`,
  };

  return axios
    .post(ONTOLOGY_ENDPOINT, postData, axiosConfig)
    .then(function (response) {
      let features = [];
      const { results } = response.data;
      const { bindings } = results;

      for (let i = 0; i < bindings.length; i++) {
        features.push({
          label: bindings[i].label?.value,
          range: DATA_TYPES[bindings[i].range?.value.split('#')[1]],
          class: bindings[i].value?.value,
          sequence: bindings[i].sequence?.value,
          sensitivity: bindings[i].comment?.value.split("-")[1] === "high"? true: false,
          sensitivityLevel: bindings[i].comment?.value.split("-")[1]
        });
      }
      
      return features;
    })
    .catch(function (error) {
      console.log(error);
      return error;
    });
}

function fetchSubClassesByOntologyClassName(ontologyName){
  const postData = {
    query: `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT DISTINCT ?individual ?label ?comment
      WHERE {
        ?individual rdfs:subClassOf <${ONTOLOGY_CLASSES[ontologyName]}>.
        OPTIONAL {?individual rdf:type owl:Class}
        OPTIONAL {?individual rdfs:label ?label}
        OPTIONAL {?individual rdfs:comment ?comment}
      }
    `,
  };

  return axios
  .post(ONTOLOGY_ENDPOINT, postData, axiosConfig)
  .then(function (response) {
    const {results} = response.data;
    const {bindings} = results;
    const data = bindings.map((item) => ({
      key: item.individual.value,
      value: item.label.value,
      comment: item.comment.value
    }));
    return data;
   })
  .catch(function (error) {
    console.log(error);
    return error;
  });
}

module.exports = {
  fetchClasses,
  fetchDataPropertiesByOntologyClassName,
  fetchIndividualsByOntologyClassName,
  fetchIndividualsPropertiesByOntologyClassName,
  fetchSubClassesByOntologyClassName,
};
