var redis = require('redis')
var sub = redis.createClient();
var pub = redis.createClient();

sub.subscribe('chat');


var events = function(io){
    io.on('connection', function(socket){
	console.log('user connect');
    });
}

module.exports = events;
