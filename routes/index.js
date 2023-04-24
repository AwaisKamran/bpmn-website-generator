
    var express = require('express');
    var router = express.Router();
  
      router.get('/viewProductCategory', function(req, res) {
        res.render('pages/viewProductCategory');
      });
    
      router.get('/addProducts', function(req, res) {
        res.render('pages/addProducts');
      });
    
      router.get('/checkoutOrder', function(req, res) {
        res.render('pages/checkoutOrder');
      });
    
      router.get('/enterPersonalDetails', function(req, res) {
        res.render('pages/enterPersonalDetails');
      });
    
      router.get('/enterShippingAddress', function(req, res) {
        res.render('pages/enterShippingAddress');
      });
    
      router.get('/enterPaymentDetails', function(req, res) {
        res.render('pages/enterPaymentDetails');
      });
    
      router.get('/reviewOrder', function(req, res) {
        res.render('pages/reviewOrder');
      });
    
    module.exports = router;
  