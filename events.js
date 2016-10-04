var redis = require('redis')
var sub = redis.createClient();
var pub = redis.createClient();

sub.subscribe('newMessage');

var events = function(io){
    io.on('connection', function(socket){
	       socket.on('chat', function(msg){
               pub.publish('newMessage', msg);
           });

           sub.on('message', function(channel, msg){
               socket.emit(channel, msg);
           });
    });
}

module.exports = events;
