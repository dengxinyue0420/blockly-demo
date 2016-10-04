var redis = require('redis')
var sub = redis.createClient();
var pub = redis.createClient();

sub.subscribe('newBlock');

var events = function(io){
    io.on('connection', function(socket){
	       socket.on('block', function(msg){
               console.log("receive new block event for publishing");
               console.log(msg);
               pub.publish('newBlock', msg);
           });

           sub.on('message', function(channel, msg){
               console.log("ready to subscribe "+channel+" "+msg);
               socket.emit(channel, msg);
           });
    });
}

module.exports = events;
