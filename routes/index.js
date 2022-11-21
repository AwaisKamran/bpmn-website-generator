
    var express = require('express');
    var router = express.Router();
  
      app.get('/selectItem', function(req, res) {
        res.render('pages/selectItem');
      });
    
      app.post('/enterPersonalDetails', function(req, res) {
        res.render('pages/enterPersonalDetails');
      });
    
      app.post('/enterShippingAddress', function(req, res) {
        res.render('pages/enterShippingAddress');
      });
    
      app.post('/enterPaymentDetails', function(req, res) {
        res.render('pages/enterPaymentDetails');
      });
    
    module.exports = router;
  