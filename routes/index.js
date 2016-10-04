var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    var UID = global.userCount;
    global.userCount += 1;
    req.session.user = UID;
    res.render('index', { title: 'Blockly-Demo', uid:UID });
});

module.exports = router;
