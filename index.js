const bodyParser = require("body-parser");
const express = require("express");
const routes = require("./routes");

const app = express();

app.use("/", routes);
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(8000, function () {
  console.log("Listening to Port 8000");
});
