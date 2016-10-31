var redis = require('redis')
var sub = redis.createClient();
var pub = redis.createClient();

//sub.subscribe('newBlock');

var channel = "";
var events = function(io){
    io.on('connection', function(socket){
        console.log("connection is on");
        socket.on('channel', function(msg){
            console.log("subscribe to channel "+msg);
            channel = msg;
            sub.subscribe(channel);
        });

       socket.on('block', function(msg){
           console.log("receive new block event for publishing");
           console.log(msg);
           pub.publish(channel, msg);
       });

       sub.on('message', function(ch, msg){
           console.log("ready to emit "+channel+" "+msg);
           socket.emit(ch, msg);
       });
    });
}

module.exports = events;
