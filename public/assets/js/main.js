function getIRIParameterValue(requestedKey) {
    let pageIRI = window.location.search.substring(1);
    let pageIRIVariables = pageIRI.split('&');
    for (let i = 0; i < pageIRIVariables.length; i++) {
        let data = pageIRIVariables[i].split('=');
        if (data[0] == requestedKey) {
            return data[1];
        }
    }
    return null;
}

let username = decodeURI(getIRIParameterValue('username'));
if (typeof username == 'undefined' || username === null || username === "null" || !username) {
    username = "Anomynous_" + Math.floor(Math.random() * 1000);
}

let chatRoom = decodeURI(getIRIParameterValue('game_id'));
if (typeof chatRoom == 'undefined' || chatRoom === null || chatRoom === "null" || !chatRoom) {
    chatRoom = "Lobby";
}
let socket = io();
socket.on('log', function (array) {
    console.log.apply(console, array);
});

function makeInviteButton(socket_id) {
    let newHTML = "<button type='button' class='btn btn-outline-primary'>Invite</Button>";
    let newNode = $(newHTML);

    newNode.click(() => {
        let payload = {
            requested_user: socket_id
        }
        console.log("**** Client log message, sending 'invite' command" + JSON.stringify(payload));
        socket.emit('invite', payload)
    })
    return newNode;
}

function makeInvitedButton(socket_id) {
    let newHTML = "<button type='button' class='btn btn-primary'>Invited</Button>";
    let newNode = $(newHTML);

    newNode.click(() => {
        let payload = {
            requested_user: socket_id
        }
        console.log("**** Client log message, sending 'uninvite' command" + JSON.stringify(payload));
        socket.emit('uninvite', payload)
    })
    return newNode;
}

function makePlayButton(socket_id) {
    let newHTML = "<button type='button' class='btn btn-success'>Play</Button>";
    let newNode = $(newHTML);

    newNode.click(() => {
        let payload = {
            requested_user: socket_id
        }
        console.log("**** Client log message, sending 'game_start' command" + JSON.stringify(payload));
        socket.emit('game_start', payload)
    })
    return newNode;
}

function makeStartGameButton() {
    let newHTML = "<button type='button' class='btn btn-danger'>Starting Game</Button>";
    let newNode = $(newHTML);
    return newNode;
}

socket.on('invite_response', (payload) => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        return;
    }

    let newNode = makeInvitedButton(payload.socket_id);
    $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
})

socket.on('invited', (payload) => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        return;
    }

    let newNode = makePlayButton(payload.socket_id);
    $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
})

socket.on('uninvited', (payload) => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        return;
    }

    let newNode = makeInviteButton(payload.socket_id);
    $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
})

socket.on('game_start_response', (payload) => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        return;
    }

    let newNode = makeStartGameButton();
    $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
    window.location.href = 'game.html?username=' + username + '&game_id=' + payload.game_id;
})

socket.on('join_room_response', (payload) => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        return;
    }

    if (payload.socket_id === socket.id) {
        return;
    }

    let domElement = $('.socket_' + payload.socket_id)
    if (domElement.length !== 0) {
        return;
    }
    let nodeA = $("<div></div>");
    nodeA.addClass("row");
    nodeA.addClass("align-items-center");
    nodeA.addClass("socket_" + payload.socket_id);
    nodeA.hide();

    let nodeB = $("<div></div>");
    nodeB.addClass("col");
    nodeB.addClass("text-end");
    nodeB.addClass("socket_" + payload.socket_id);
    nodeB.append('<h4>' + payload.username + '</h4>');

    let nodeC = $("<div></div>");
    nodeC.addClass("col");
    nodeC.addClass("text-start");
    nodeC.addClass("socket_" + payload.socket_id);

    let buttonC = makeInviteButton(payload.socket_id);
    nodeC.append(buttonC);

    nodeA.append(nodeB);
    nodeA.append(nodeC);

    $("#players").append(nodeA);
    nodeA.show("fade", 1000);

    let newHTML = "<p class='join_room_response'>" + payload.username + " joined the chatroom. (There are " + payload.count + "users in this room)</p>";
    let newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show('fade', 500);
})

socket.on('player_disconnected', (payload) => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }

    let domElement = $('.socket_' + payload.socket_id)
    if (domElement.length !== 0) {
        domElement.hide("fade", 500);
    }

    let newHTML = "<p class='left_room_response'>" + payload.username + " left the chatroom. (There are " + payload.count + "users in this room)</p>";
    let newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show('fade', 500);


})

socket.on('send_chat_message_response', (payload) => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        return;
    }

    let newHTML = "<p class='chat_message'><b>" + payload.username + "</b>: " + payload.message + "</p>";
    let newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show('fade', 500);
})

let old_board = [
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
]

let my_color = "";
let interval_timer;

socket.on('game_update', (payload) => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        return;
    }

    let board = payload.game.game_board;
    if (typeof board == 'undefined' || board === null) {
        console.log('Server did not send a valid board');
        return;
    }

    if (socket.id === payload.game.player_blue.socket) {
        my_color = 'blue';
    }
    else if (socket.id === payload.game.player_yellow.socket) {
        my_color = 'yellow';
    }
    else {
        window.location.href = "lobby.html?username=" + username;
        return;
    }

    $("#my_color").html('<h3 id="<my_color">I am ' + my_color + '</h3>');

    if (payload.game.whose_turn === 'blue') {
        $("#my_color").append('<h4>It is Blue\'s turn</h4>');
    }
    else if (payload.game.whose_turn === 'yellow') {
        $("#my_color").append('<h4>It is Yellow\'s turn</h4>');
    }

    let blueSum = 0;
    let yellowSum = 0;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === 'b') {
                blueSum++;
            }
            else if (board[row][col] === 'y') {
                yellowSum++;
            }

            if (old_board[row][col] != board[row][col]) {
                let graphic = "";
                let altTag = "";
                if (old_board[row][col] === ' ' && board[row][col] === 'b') {
                    graphic = 'empty_to_blue.gif';
                    altTag = 'blue token';
                }
                else if (old_board[row][col] === ' ' && board[row][col] === 'y') {
                    graphic = 'empty_to_yellow.gif';
                    altTag = 'yellow token';
                }
                else if (old_board[row][col] === 'b' && board[row][col] === ' ') {
                    graphic = 'blue_to_empty.gif';
                    altTag = 'empty space';
                }
                else if (old_board[row][col] === 'y' && board[row][col] === ' ') {
                    graphic = 'empty_to_yellow.gif';
                    altTag = 'empty space';
                }
                else if (old_board[row][col] === 'y' && board[row][col] === 'b') {
                    graphic = 'yellow_to_blue.gif';
                    altTag = 'blue token';
                }
                else if (old_board[row][col] === 'b' && board[row][col] === 'y') {
                    graphic = 'blue_to_yellow.gif';
                    altTag = 'yellow token';
                }
                else {
                    graphic = 'error.gif';
                    altTag = "Error";
                }

                $('#' + row + '_' + col).html("<img class=\"img-fluid\" src=\"assets/images/" + graphic + "?time=" + Date.now() + "\" alt=\"" + altTag + "\" />");
            }

            $('#' + row + '_' + col).off("click");
            $('#' + row + '_' + col).removeClass('hovered_over');

            if (payload.game.whose_turn === my_color) {
                if (payload.game.legal_moves[row][col] === my_color.substring(0, 1)) {
                    $('#' + row + '_' + col).addClass('hovered_over');
                    $('#' + row + '_' + col).click(((r, c) => {
                        return (() => {
                            let payload = {
                                row: r,
                                column: c,
                                color: my_color
                            };
                            console.log("**** Client log message, sending 'play_token' command" + JSON.stringify(payload));
                            socket.emit('play_token', payload);
                        });
                    })(row, col));
                }

            }
        }
    }

    clearInterval(interval_timer);
    interval_timer = setInterval(((last_time)=>{
        return (()=>{
            let d = new Date();
            let elapase_m = d.getTime() - last_time;
            let minutes = Math.floor((elapase_m/1000) / 60);
            let seconds = Math.floor(elapase_m % (60 * 1000) / 1000);
            let total = minutes * 60 + seconds;
            let timestring = ""+seconds;
            timestring = timestring.padStart(2, '0');
            timestring = minutes + ":" + timestring;
            if(total>100){
                total = 100;
            }
            $("#elapsed").css('width', total + '%').attr('aria-valuenow', total);
            if(total >= 100){
                $("#elapsed").html("Times up!");
            }else{
                $("#elapsed").html(timestring);
            }
        })
    })(payload.game.last_move_time), 1000);


    $('#bluesum').html(blueSum);
    $('#yellowsum').html(yellowSum);
    old_board = board;
})

socket.on("game_over", payload => {
    console.log("**** Client received payload" + JSON.stringify(payload));
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        return;
    }

    let nodeA = $("<div id=game_over'></div>");
    let nodeB = $("<h1>Game Over</h1>");
    let nodeC = $("<h2>" + payload.who_won + " won!</h2>");
    let nodeD = $("<a href='lobby.html?username=" + username + "' class='btn btn-lg btn-success' role='button'>Return to lobby</a>");
    nodeA.append(nodeB);
    nodeA.append(nodeC);
    nodeA.append(nodeD);
    nodeA.hide();
    $("#game_over").replaceWith(nodeA);
    nodeA.show("fade", 1000);
})

socket.on("play_token_response", payload => {
    if (typeof payload == 'undefined' || payload === null) {
        console.log('Server did not send a payload');
        return;
    }
    if (payload.result == 'fail') {
        console.log(payload.message);
        alert(payload.message);
        return;
    }
})


function sendChatMessage() {
    let request = {};
    request.room = chatRoom;
    request.username = username;
    request.message = $('#chatMessage').val();
    console.log("**** Client log message, sending 'send_chat_message' command" + JSON.stringify(request));
    socket.emit('send_chat_message', request);
    $('#chatMessage').val('');
}


$(() => {
    let request = {};
    request.room = chatRoom;
    request.username = username;
    console.log("**** Client log message, sending 'join_room' command" + JSON.stringify(request));
    socket.emit('join_room', request);

    $('#lobbyTitle').html(username + "'s Lobby");
    $('#quit').html("<a href='lobby.html?username=" + username + "' class='btn btn-danger' role='button'>Quit</a>");

    $('#chatMessage').keypress(function (e) {
        let key = e.which;
        if (key == 13) {
            $('button[id=chatButton]').click();
            return false;
        }
    })
})
