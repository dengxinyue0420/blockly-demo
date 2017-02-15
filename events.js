var redis = require('redis')
var pub = redis.createClient();
var projectJoinedUser = new Map();
var debug = false;

var debugging = function(msg){
    if(debug){
        console.log(msg);
    }
}
var logging = function(user, project, source, eventType, rest){
    console.log("{timestamp: "+Date.now()
    +", user: "+user
    +", projectId: "+project
    +", source: "+source
    +", eventType: "+eventType
    +rest
    +"}");
}
var events = function(io){
    io.on('connection', function(socket){
        var sub = redis.createClient();
        var subscribedChannel = new Set();
        var userEmail = "";
        var projectID = "";
        var screenChannel = "";
        // Subscribe to user channel
        socket.on('userChannel', function(msg){
            if(!subscribedChannel.has(msg)){
                subscribedChannel.add(msg);
                userEmail = msg;
                sub.subscribe(msg);
                debugging(userEmail + " subscribe to user channel "+msg);
            }
        });
        // Subscribe to project channel
        socket.on('projectChannel', function(msg){
            if(!subscribedChannel.has(msg)){
                subscribedChannel.add(msg);
                projectID = msg;
                sub.subscribe(msg);
                debugging(userEmail + " subscribe to project channel "+msg);
            }
        });
        // Subscribe to a screen channel, each socket should only have one screen channel on friendly
        socket.on("screenChannel", function(msg){
            if(screenChannel===msg){
                return;
            }
            if(screenChannel!==""){
                sub.unsubscribe(screenChannel);
                debugging(userEmail + " unsubscribe to screen channel "+ screenChannel);
            }
            screenChannel = msg;
            sub.subscribe(screenChannel);
            debugging(userEmail + " subscribe to screen channel "+ screenChannel);
        });

        // Publish changes to user channel when a project is shared
        socket.on('shareProject', function(msg){
            debugging(userEmail + " on shareProject "+msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
            logging(userEmail, msg["project"], "Other", "share", ", shareTo: "+msg["channel"]);
        });

        // Publish changes to project channel when a user opens a project
        socket.on('userJoin', function(msg){
            debugging(userEmail+" on userJoin "+ msg);
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
                socket.emit(msg["project"], JSON.stringify(pubMsg));
            });
            var pubSelf = {
                "type" : "join",
                "user" : userEmail
            };
            pub.publish(msg["project"], JSON.stringify(pubSelf));
            logging(userEmail, msg["project"], "Other", "user.join", "");
        });
        // Publish changes to project channel when a user closes a project
        socket.on('userLeave', function(msg){
            debugging(userEmail+" on userLeave "+ msg);
            var pubMsg = {
                "type" : "leave",
                "user" : msg["user"]
            };
            if(projectJoinedUser.has(msg["project"])){
                projectJoinedUser.get(msg["project"]).delete(msg["user"]);
            }
            pub.publish(msg["project"], JSON.stringify(pubMsg));
            logging(userEmail, msg["project"], "Other", "user.leave", "");
        });
        // Publish changes to screen channel when blocks changed
        socket.on('block', function(msg){
            debugging(userEmail+" on block "+ msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
        });
        // Designer events
        socket.on('component', function(msg){
            debugging(userEmail+" on component "+ msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
        })
        sub.on('message', function(ch, msg){
            debugging(userEmail + " receive message on "+ch+" msg: "+msg);
            socket.emit(ch, msg);
        });

        //disconnection
        socket.on("disconnect", function(){
            debugging(userEmail+" connection is off");
            var pubMsg = {
                "type" : "leave",
                "user" : userEmail
            };
            if(projectJoinedUser.has(projectID)){
                projectJoinedUser.get(projectID).delete(userEmail);
            }
            pub.publish(projectID, JSON.stringify(pubMsg));
        });
    });
}

module.exports = events;
