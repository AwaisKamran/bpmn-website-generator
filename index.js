const bodyParser = require("body-parser");
const express = require("express");
const routes = require("./routes");
const cors = require("cors");
require("dotenv").config();

const corsOptions = {
  origin:'*'
}

const app = express();

app.use(cors(corsOptions)) 
const port = process.env.BASE;

app.use("/", routes);
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(process.env.BASE, function () {
  console.log(`Listening to Port ${port}`);
});
