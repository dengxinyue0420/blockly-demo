var redis = require('redis')
var pub = redis.createClient();
var projectJoinedUser = new Map();
var debug = false;
var log = true;

var debugging = function(msg){
    if(debug){
        console.log(msg);
    }
}
var logging = function(obj){
    if(log){
        console.log(JSON.stringify(obj));
    }
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
        // Subscribe to a screen channel, each socket should only have one screen channel on fly
        // TODO(xinyue): Modify this to support multiple screens, user should subscribe all screen channels
        // in the project when user joins the project, and ubsubscribe
        // all screen channels when leave the project.
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
            var lmsg = {
                timestamp : Date.now(),
                user : userEmail,
                projectId : msg["project"],
                source : "Other",
                eventType: "share",
                shareTo: msg["channel"]
            }
            logging(lmsg);
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
                    "project": msg["project"],
                    "type" : "join",
                    "user" : e
                };
                socket.emit(msg["project"], JSON.stringify(pubMsg));
            });
            var pubSelf = {
                "project": msg["project"],
                "type" : "join",
                "user" : userEmail
            };
            pub.publish(msg["project"], JSON.stringify(pubSelf));
            var lmsg = {
                timestamp : Date.now(),
                user : userEmail,
                projectId : msg["project"],
                source : "Other",
                eventType: "user.join"
            }
            logging(lmsg);
        });
        // Publish changes to project channel when a user closes a project
        socket.on('userLeave', function(msg){
            debugging(userEmail+" on userLeave "+ msg);
            var pubMsg = {
                "project": msg["project"],
                "type" : "leave",
                "user" : msg["user"]
            };
            if(projectJoinedUser.has(msg["project"])){
                projectJoinedUser.get(msg["project"]).delete(msg["user"]);
            }
            pub.publish(msg["project"], JSON.stringify(pubMsg));
            var lmsg = {
                timestamp : Date.now(),
                user : userEmail,
                projectId : msg["project"],
                source : "Other",
                eventType: "user.leave"
            }
            logging(lmsg);
        });

        socket.on('leader', function(msg){
            debugging(userEmail+" on leader "+msg);
            var pubMsg = {
                "project" : msg["project"],
                "type" : "leader",
                "user" : msg["user"],
                "leader" : msg["leader"],
                "leaderEmail" : msg["leaderEmail"]
            };
            pub.publish(msg["project"], JSON.stringify(pubMsg));
        });
        // Publish changes to screen channel when blocks changed
        socket.on('block', function(msg){
            debugging(userEmail+" on block "+ msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
            var proj = msg["channel"].split("_")[0];
            var evt = msg["event"];
            switch (evt["type"]) {
                case "create":
                case "delete":
                    var lmsg = {
                        timestamp : Date.now(),
                        user : userEmail,
                        projectId : proj,
                        source : "Block",
                        eventType: evt["type"],
                        blockId: evt["blockId"]
                    }
                    logging(lmsg);
                    break;
                case "move":
                    var lmsg = {
                        timestamp : Date.now(),
                        user : userEmail,
                        projectId : proj,
                        source : "Block",
                        eventType: evt["type"],
                        blockId: evt["blockId"],
                        parentId: evt["newParentId"]
                    }
                    logging(lmsg);
                    break;
                case "change":
                    var lmsg = {
                        timestamp : Date.now(),
                        user : userEmail,
                        projectId : proj,
                        source : "Block",
                        eventType: evt["type"],
                        blockId: evt["blockId"],
                        propertyName: evt["name"]
                    }
                    logging(lmsg);
                    break;
                default:
                    break;
            }
        });
        // Designer events
        socket.on('component', function(msg){
            debugging(userEmail+" on component "+ msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
            var evt = msg["event"];
            switch (evt["type"]) {
                case "component.create":
                case "component.delete":
                    var lmsg = {
                        timestamp : Date.now(),
                        user : userEmail,
                        projectId : evt["projectId"],
                        source : "Designer",
                        eventType: evt["type"],
                        componentId: evt["componentId"]
                    }
                    logging(lmsg);
                    break;
                case "component.move":
                    var lmsg = {
                        timestamp : Date.now(),
                        user : userEmail,
                        projectId : evt["projectId"],
                        source : "Designer",
                        eventType: evt["type"],
                        componentId: evt["componentId"],
                        parentId: evt["parentId"]
                    }
                    logging(lmsg);
                    break;
                case "component.property":
                    var lmsg = {
                        timestamp : Date.now(),
                        user : userEmail,
                        projectId : evt["projectId"],
                        source : "Designer",
                        eventType: evt["type"],
                        componentId: evt["componentId"],
                        propertyName: evt["property"]
                    }
                    logging(lmsg);
                    break;
                default:
                    break;
            }
        });

        // publish latest status
        socket.on("status", function(msg){
            pub.publish(msg["channel"], JSON.stringify(msg));
        });
        // get status from others
        socket.on("getStatus", function(msg){
            pub.publish(msg["channel"], JSON.stringify(msg));
        });

        // file upload
        socket.on("file", function(msg){
            pub.publish(msg["channel"], JSON.stringify(msg));
        });

        // receive subscribe message
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
            var lmsg = {
                timestamp : Date.now(),
                user : userEmail,
                projectId : projectID,
                source : "Other",
                eventType: "user.leave"
            }
            logging(lmsg);
        });
    });
}

module.exports = events;
