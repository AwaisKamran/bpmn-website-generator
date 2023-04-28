const bodyParser = require("body-parser");
const express = require("express");
const routes = require("./routes");
require("dotenv").config();

const app = express();

app.use("/", routes);
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(process.env.BASE, function () {
  console.log("Listening to Port 8000");
});
