require("dotenv").config();

const BASE_LINK = `http://localhost:${process.env.BASE}/`;
const PATH_TO_BPMN_FILE = process.env.ECOMMERCE;
const LISTING = "listing";
const ACTION = "action";
const LOCAL = "local";
const CATEGORY = "category";
const GET = "get";
const POST = "post";

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
  DATA_TYPES
};

// Copy .env file
// ECOMMERCE = "./fixtures/e-commerce/diagram-1.bpmn"
// ECOMMERCE_ONTOLOGY_ENDPOINT = "http://localhost:3030/e-commerce"