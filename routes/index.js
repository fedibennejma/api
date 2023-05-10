var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  const used = process.memoryUsage();
  let result = ''
  for (let key in used) {
    result += `${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB \n`;
  }
  res.render('index', { title: result });
});

module.exports = router;
