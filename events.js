var redis = require('redis')
var sub = redis.createClient();
var pub = redis.createClient();

sub.subscribe('newBlock');

var events = function(io){
    io.on('connection', function(socket){
        console.log("connection is on");
        // Subscribe to channel
        socket.on('channel', function(msg){
            console.log("subscribe to user channel "+msg);
            sub.subscribe(msg);
        });
        // Publish changes to user channel when a project is shared
        socket.on('shareProject', function(msg){
            console.log("receive new project published to "+msg["channel"]);
            console.log(msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
        });
        // Publish changes to screen channel when blocks changed
        socket.on('block', function(msg){
            console.log("receive new block event for publishing");
            console.log(msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
        });
        // Test
        socket.on('testblock', function(msg){
            console.log("receive new block event for publishing");
            console.log(msg);
            pub.publish("newBlock", msg);
        });

        sub.on('message', function(ch, msg){
            console.log("ready to emit "+ch+" "+msg);
            socket.emit(ch, msg);
        });
    });
}

module.exports = events;
