
    var express = require('express');
    var router = express.Router();
    const cors = require("cors");

    const corsOptions = {
      origin:'*'
    }
    
    const app = express();
    app.use(cors(corsOptions)) 
  
        router.get('/', function(req, res) {
          res.render('pages/enterCredential');
        });
      
      router.get('/enterCredential', function(req, res) {
        res.render('pages/enterCredential');
      });
    
      router.get('/viewOrder', function(req, res) {
        res.render('pages/viewOrder');
      });
    
      router.get('/reviewOrder', function(req, res) {
        res.render('pages/reviewOrder');
      });
    
    module.exports = router;
  