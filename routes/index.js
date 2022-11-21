
    var express = require('express');
    var router = express.Router();
  
      router.get('/selectItem', function(req, res) {
        res.render('pages/selectItem');
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
    
    module.exports = router;
  