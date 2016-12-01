$(document).ready(function(){
    var socket = io();
    var user = $('#user').text().substring(5);
    var colors = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#cab2d6', '#6a3d9a'];

    socket.on('newBlock', function(msg){
        var msgJSON = JSON.parse(msg);
        var userFrom = msgJSON["user"];
        console.log("User"+ user +"receive new events from "+userFrom);
        console.log(msgJSON["event"]);
        if(userFrom != user){
            var newEvent = Blockly.Events.fromJson(msgJSON["event"], workspace);
            Blockly.Events.disable();
            newEvent.run(true);
            Blockly.Events.enable();
        }
    });

    var toolbox = '<xml>' + '<block type="controls_if"></block>'
      + '<block type="controls_repeat_ext"></block>'
      + '<block type="logic_compare"></block>'
      + '<block type="math_number"></block>'
      + '<block type="math_arithmetic"></block>'
      + '<block type="text"></block>'
      + '<block type="text_print"></block>'
      + '</xml>';
    var workspace = Blockly.inject('blocklyWorkspace',{
        toolbox: toolbox
    });

    workspace.addChangeListener(pubEvent);

    function pubEvent(event){
        if(event.type==Blockly.Events.UI){
            return;
        }
        var msg = {
            "user" : user,
            "event" : event.toJson()
        }
        var eventJson = JSON.stringify(msg);
        console.log(eventJson);
        socket.emit('testblock', eventJson);
    }
});
