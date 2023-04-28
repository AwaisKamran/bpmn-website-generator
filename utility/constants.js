require("dotenv").config();

const BASE_LINK = `http://localhost:${process.env.BASE}/`;
const PATH_TO_BPMN_FILE = process.env.ECOMMERCE;
const LISTING = "listing";
const ACTION = "action";
const CATEGORY = "category";
const GET = "get";
const POST = "post";

module.exports = {
  PATH_TO_BPMN_FILE,
  LISTING,
  CATEGORY,
  ACTION,
  GET,
  POST,
  BASE_LINK
};

// Copy .env file
// ECOMMERCE = "./fixtures/e-commerce/diagram-1.bpmn"
// ECOMMERCE_ONTOLOGY_ENDPOINT = "http://localhost:3030/e-commerce"