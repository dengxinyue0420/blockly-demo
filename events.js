var redis = require('redis')
var pub = redis.createClient();
var projectJoinedUser = new Map();

var events = function(io){
    io.on('connection', function(socket){
        var sub = redis.createClient();
        var subscribedChannel = new Set();
        var userEmail = "";
        var projectID = "";
        var screenChannel = "";
        console.log("connection is on");
        // Subscribe to user channel
        socket.on('userChannel', function(msg){
            if(!subscribedChannel.has(msg)){
                console.log("subscribe to user channel "+msg);
                subscribedChannel.add(msg);
                userEmail = msg;
                sub.subscribe(msg);
            }
        });
        // Subscribe to project channel
        socket.on('projectChannel', function(msg){
            if(!subscribedChannel.has(msg)){
                console.log("subscribe to project channel "+msg);
                subscribedChannel.add(msg);
                projectID = msg;
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
            console.log(msg);
            var joinedUsers;
            if(projectJoinedUser.has(msg["project"])){
                joinedUsers = projectJoinedUser.get(msg["project"]);
            }else{
                joinedUsers = new Set();
                projectJoinedUser.set(msg["project"], joinedUsers);
            }
            joinedUsers.add(msg["user"]);
            console.log(joinedUsers);
            joinedUsers.forEach(function(e){
                var pubMsg = {
                    "type" : "join",
                    "user" : e
                };
                console.log(userEmail +" send publish msg about "+e);
                pub.publish(msg["project"], JSON.stringify(pubMsg));
            });
        });
        // Publish changes to project channel when a user closes a project
        socket.on('userLeave', function(msg){
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
        // Designer events
        socket.on('component', function(msg){
            console.log("receive new component event for publishing");
            console.log(msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
        })
        sub.on('message', function(ch, msg){
            console.log(userEmail + " ready to emit "+ch+" "+msg);
            socket.emit(ch, msg);
        });

        //disconnection
        socket.on("disconnect", function(){
            console.log(userEmail+" connection is off");
            var pubMsg = {
                "type" : "leave",
                "user" : userEmail
            };
            console.log(pubMsg);
            if(projectJoinedUser.has(projectID)){
                projectJoinedUser.get(projectID).delete(userEmail);
            }
            pub.publish(projectID, JSON.stringify(pubMsg));
        });
    });
}

module.exports = events;
