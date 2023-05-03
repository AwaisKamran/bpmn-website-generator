require("dotenv").config();

const BASE_LINK = `http://localhost:${process.env.BASE}/`;
const PATH_TO_BPMN_FILE = process.env.ECOMMERCE;
const LISTING = "listing";
const ACTION = "action";
const ORDER = "order";
const LOCAL = "local";
const CATEGORY = "category";
const GET = "get";
const POST = "post";
const PRODUCT = "product"

const DATA_TYPES =  {
  "string": "text",
  "integer": "number",
  "dateTime": "date"
}

module.exports = {
  PATH_TO_BPMN_FILE,
  LISTING,
  CATEGORY,
  ACTION,
  GET,
  POST,
  BASE_LINK,
  LOCAL,
  DATA_TYPES,
  ORDER,
  PRODUCT
};

// Copy .env file
// BASE = 8000
// ECOMMERCE = "./fixtures/e-commerce/diagram-1.bpmn"
// ECOMMERCE_ONTOLOGY_ENDPOINT = "http://localhost:3030/e-commerce/sparql"

// PHARMACY = "./fixtures/pharmacy/diagram-1.bpmn"
// PHARMACY_ONTOLOGY_ENDPOINT = "http://localhost:3030/pharmacy/sparql"