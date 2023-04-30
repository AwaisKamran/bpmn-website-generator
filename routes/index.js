
    var express = require('express');
    var router = express.Router();
    const cors = require("cors");

    const corsOptions = {
      origin:'*'
    }
    
    const app = express();
    app.use(cors(corsOptions)) 
  
        router.get('/', function(req, res) {
          res.render('pages/viewCategory');
        });
      
      router.get('/viewCategory', function(req, res) {
        res.render('pages/viewCategory');
      });
    
      router.get('/viewProduct', function(req, res) {
        res.render('pages/viewProduct');
      });
    
      router.get('/viewCart', function(req, res) {
        res.render('pages/viewCart');
      });
    
      router.get('/enterPerson', function(req, res) {
        res.render('pages/enterPerson');
      });
    
      router.get('/enterAddress', function(req, res) {
        res.render('pages/enterAddress');
      });
    
      router.get('/enterPayment', function(req, res) {
        res.render('pages/enterPayment');
      });
    
      router.get('/reviewOrder', function(req, res) {
        res.render('pages/reviewOrder');
      });
    
    module.exports = router;
  