var redis = require('redis')
var sub = redis.createClient();
var pub = redis.createClient();

sub.subscribe('newBlock');
var subscribedChannel = new Set();
var projectJoinedUser = new Map();
var screenChannel = "";
var events = function(io){
    io.on('connection', function(socket){
        console.log("connection is on");
        // Subscribe to channel
        socket.on('channel', function(msg){
            if(!subscribedChannel.has(msg)){
                console.log("subscribe to user channel "+msg);
                subscribedChannel.add(msg);
                sub.subscribe(msg);
            }
        });

        // Subscribe to a screen channel, each socket should only have one screen channel on friendly
        socket.on("screenChannel", function(msg){
            if(screenChannel===msg){
                return;
            }
            if(screenChannel!==""){
                sub.unsubscribe(screenChannel);
            }
            screenChannel = msg;
            sub.subscribe(screenChannel);
        });

        // Publish changes to user channel when a project is shared
        socket.on('shareProject', function(msg){
            console.log("receive new project published to "+msg["channel"]);
            console.log(msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
        });
        // Publish changes to project channel when a user opens a project
        socket.on('userJoin', function(msg){
            console.log("One user join");
            console.log(msg);
            var joinedUsers;
            if(projectJoinedUser.has(msg["project"])){
                joinedUsers = projectJoinedUser.get(msg["project"]);
            }else{
                joinedUsers = new Set();
                projectJoinedUser.set(msg["project"], joinedUsers);
            }
            joinedUsers.add(msg["user"]);
            joinedUsers.forEach(function(e){
                var pubMsg = {
                    "type" : "join",
                    "user" : e
                };
                pub.publish(msg["project"], JSON.stringify(pubMsg));
            });
        });
        // Publish changes to project channel when a user closes a project
        socket.on('userLeave', function(msg){
            console.log("One user leave");
            console.log(msg);
            var pubMsg = {
                "type" : "leave",
                "user" : msg["user"]
            };
            console.log(pubMsg);
            if(projectJoinedUser.has(msg["project"])){
                projectJoinedUser.get(msg["project"]).delete(msg["user"]);
            }
            pub.publish(msg["project"], JSON.stringify(pubMsg));
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
        // Designer events
        socket.on('component', function(msg){
            console.log("receive new component event for publishing");
            console.log(msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
        })
        sub.on('message', function(ch, msg){
            console.log("ready to emit "+ch+" "+msg);
            socket.emit(ch, msg);
        });
    });
}

module.exports = events;
