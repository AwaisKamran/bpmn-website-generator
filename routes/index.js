var express = require("express");
var router = express.Router();

router.get("/", function (req, res) {
  res.render("pages/index");
});

router.get("/selectItem", function (req, res) {
  res.render("pages/selectItem");
});

router.post("/enterPersonalDetails", function (req, res) {
  res.render("pages/enterPersonalDetails");
});

router.post("/enterShippingAddress", function (req, res) {
  res.render("pages/enterShippingAddress");
});

router.post("/enterPaymentDetails", function (req, res) {
  res.render("pages/enterPaymentDetails");
});

module.exports = router;
