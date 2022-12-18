
    var express = require('express');
    var router = express.Router();

    router.get('/generated-page', function(req, res) {
      res.render('pages/generated-page');
    });
  
    module.exports = router;
  