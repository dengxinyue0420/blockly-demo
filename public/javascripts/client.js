$(document).ready(function(){
    var socket = io();

    socket.on('newMessage', function(msg){
        $('#message').append('<p>'+msg+'</p>');
    });

    $('#sendMessage').submit(function(event){
        event.preventDefault();
        socket.emit('chat', $('#msg').val());
        $('#msg').val('');
        return false;
    });
});
