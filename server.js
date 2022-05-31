let static = require('node-static');

let http = require('http');

let port = process.env.PORT;
let directory = __dirname + '/public';

if (typeof port == 'undefined' || port == null) {
    port = 8080;
    directory = './public';
}

let file = new static.Server(directory);

let app = http.createServer(
    function (request, response) {
        request.addListener('end',
            function () {
                file.serve(request, response);
            }
        ).resume();
    }
).listen(port);

console.log('server is running');

let players = [];
let games = [];

const { Server } = require('socket.io');
const io = new Server(app);

io.on("connection", (socket) => {
    function serverLog(...messages) {
        io.emit('log', ['**** Message from the server:\n']);
        messages.forEach((item) => {
            io.emit('log', ["****\t" + item]);
            console.log(item);
        })
    };
    serverLog('a page connected to the server: ' + socket.id);

    socket.on('disconnect', () => {
        serverLog('a page disconnected to the server: ' + socket.id);
        if ((typeof players[socket.id] != 'undefined' && players[socket.id] != null)) {
            let payload = {
                username: players[socket.id].username,
                room: players[socket.id].room,
                count: Object.keys(players).length - 1,
                socket_id: socket.id
            };
            let room = players[socket.id].room;
            delete players[socket.id];
            io.of("/").to(room).emit("player_disconnected", payload);
            serverLog("player_disconnected succeeded ", JSON.stringify(payload));
        }
    });

    socket.on('join_room', (payload) => {
        serverLog("Server received a command 'join_room'", JSON.stringify(payload));
        if (typeof payload == 'undefined' || payload === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid payload';
            socket.emit('join_room_response', response);
            serverLog('join_room command failed ', JSON.stringify(response));
            return;
        }
        let room = payload.room;
        let username = payload.username;
        if (typeof room == 'undefined' || room === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid room in payload';
            socket.emit('join_room_response', response);
            serverLog('join_room command failed ', JSON.stringify(response));
            return;
        }
        if (typeof username == 'undefined' || username === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid username in payload';
            socket.emit('join_room_response', response);
            serverLog('join_room failed ', JSON.stringify(response));
            return;
        }

        socket.join(room);

        io.in(room).fetchSockets().then((sockets) => {
            serverLog("There are " + sockets.length + " clients in the room " + room);
            if (typeof sockets == 'undefined' || sockets === null || !sockets.includes(socket)) {
                response = {};
                response.result = 'fail';
                response.message = 'Server internal error joining chat room';
                socket.emit('join_room_response', response);
                serverLog('join_room failed ', JSON.stringify(response));
                return;
            } else {
                players[socket.id] = {
                    username: username,
                    room: room
                }
                for (const member of sockets) {
                    response = {
                        result: 'success',
                        socket_id: member.id,
                        room: players[member.id].room,
                        username: players[member.id].username,
                        count: sockets.length,
                    }
                    io.of('/').to(room).emit('join_room_response', response);
                    serverLog('join_room succeeeded ', JSON.stringify(response));
                    if (room !== "Lobby") {
                        send_game_update(socket, room, 'initial update');
                    }
                }
            }
        })
    });

    socket.on('invite', (payload) => {
        serverLog("Server received a command 'invite'", JSON.stringify(payload));
        if (typeof payload == 'undefined' || payload === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid payload';
            socket.emit('invite_response', response);
            serverLog('invite command failed ', JSON.stringify(response));
            return;
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room
        let username = players[socket.id].username
        if (typeof requested_user == 'undefined' || requested_user === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid requested_username in payload';
            socket.emit('invite_response', response);
            serverLog('invite command failed ', JSON.stringify(response));
            return;
        }
        if (typeof room == 'undefined' || room === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Invited room does not exist';
            socket.emit('invite_response', response);
            serverLog('invite command failed ', JSON.stringify(response));
            return;
        }
        if (typeof username == 'undefined' || username === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Invited user does not exist';
            socket.emit('invite_response', response);
            serverLog('invite command failed ', JSON.stringify(response));
            return;
        }

        io.in(room).allSockets().then((sockets) => {
            if (typeof sockets == 'undefined' || sockets === null || !sockets.has(requested_user)) {
                response = {};
                response.result = 'fail';
                response.message = 'The user is no longer in the room';
                socket.emit('invite_response', response);
                serverLog('invite command failed ', JSON.stringify(response));
                return;
            } else {
                response = {
                    result: 'success',
                    socket_id: requested_user
                }
                socket.emit("invite_response", response);

                response = {
                    result: 'success',
                    socket_id: socket.id
                }
                socket.to(requested_user).emit("invited", response);
                serverLog('invite command succeeded ', JSON.stringify(response));
            }
        })
    });

    socket.on('uninvite', (payload) => {
        serverLog("Server received a command 'uninvite'", JSON.stringify(payload));
        if (typeof payload == 'undefined' || payload === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid payload';
            socket.emit('uninvited', response);
            serverLog('uninvite command failed ', JSON.stringify(response));
            return;
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room
        let username = players[socket.id].username
        if (typeof requested_user == 'undefined' || requested_user === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid requested_username in payload';
            socket.emit('uninvited', response);
            serverLog('uninvite command failed ', JSON.stringify(response));
            return;
        }
        if (typeof room == 'undefined' || room === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Uninvited room does not exist';
            socket.emit('uninvited', response);
            serverLog('uninvite command failed ', JSON.stringify(response));
            return;
        }
        if (typeof username == 'undefined' || username === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Uninvited user does not exist';
            socket.emit('uninvited', response);
            serverLog('uninvite command failed ', JSON.stringify(response));
            return;
        }

        io.in(room).allSockets().then((sockets) => {
            if (typeof sockets == 'undefined' || sockets === null || !sockets.has(requested_user)) {
                response = {};
                response.result = 'fail';
                response.message = 'The user is no longer in the room';
                socket.emit('uninvited', response);
                serverLog('uninvite command failed ', JSON.stringify(response));
                return;
            } else {
                response = {
                    result: 'success',
                    socket_id: requested_user
                }
                socket.emit("uninvited", response);

                response = {
                    result: 'success',
                    socket_id: socket.id
                }
                socket.to(requested_user).emit("uninvited", response);
                serverLog('uninvite command succeeded ', JSON.stringify(response));
            }
        })
    });

    socket.on('game_start', (payload) => {
        serverLog("Server received a command 'game_start'", JSON.stringify(payload));
        if (typeof payload == 'undefined' || payload === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid payload';
            socket.emit('game_start_response', response);
            serverLog('game_start command failed ', JSON.stringify(response));
            return;
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room
        let username = players[socket.id].username
        if (typeof requested_user == 'undefined' || requested_user === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid requested_username in payload';
            socket.emit('game_start_response', response);
            serverLog('game_start command failed ', JSON.stringify(response));
            return;
        }
        if (typeof room == 'undefined' || room === null) {
            response = {};
            response.result = 'fail';
            response.message = 'game starting room does not exist';
            socket.emit('game_start_response', response);
            serverLog('game_start command failed ', JSON.stringify(response));
            return;
        }
        if (typeof username == 'undefined' || username === null) {
            response = {};
            response.result = 'fail';
            response.message = 'game starting user does not exist';
            socket.emit('game_start_response', response);
            serverLog('game_start command failed ', JSON.stringify(response));
            return;
        }

        io.in(room).allSockets().then((sockets) => {
            if (typeof sockets == 'undefined' || sockets === null || !sockets.has(requested_user)) {
                response = {};
                response.result = 'fail';
                response.message = 'The user is no longer in the room';
                socket.emit('game_start_response', response);
                serverLog('game_start command failed ', JSON.stringify(response));
                return;
            } else {
                let game_id = Math.floor(1 + Math.random() * 0x100000).toString(16)
                response = {
                    result: 'success',
                    game_id: game_id,
                    socket_id: requested_user
                }
                socket.emit("game_start_response", response);

                response = {
                    result: 'success',
                    game_id: game_id,
                    socket_id: socket.id
                }
                socket.to(requested_user).emit("game_start_response", response);
                serverLog('game_start command succeeded ', JSON.stringify(response));
            }
        })
    });

    socket.on('send_chat_message', (payload) => {
        serverLog("Server received a command 'send_chat_message'", JSON.stringify(payload));
        if (typeof payload == 'undefined' || payload === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid payload';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed ', JSON.stringify(response));
            return;
        }
        let room = payload.room;
        let username = payload.username;
        let message = payload.message;
        if (typeof room == 'undefined' || room === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid room';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed', JSON.stringify(response));
            return;
        }
        if (typeof username == 'undefined' || username === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid username';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed', JSON.stringify(response));
            return;
        }
        if (typeof message == 'undefined' || message === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid message';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed', JSON.stringify(response));
            return;
        }

        let response = {};
        response.result = "success";
        response.room = room;
        response.username = username;
        response.message = message;

        io.of('/').to(room).emit('send_chat_message_response', response);
        serverLog('send_chat_message command succeeeded ', JSON.stringify(response));
    });

    socket.on('play_token', (payload) => {
        serverLog("Server received a command 'play_token'", JSON.stringify(payload));
        if (typeof payload == 'undefined' || payload === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid payload';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed ', JSON.stringify(response));
            return;
        }

        let player = players[socket.id];
        if (typeof player == 'undefined' || player === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid player';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        let username = player.username;
        if (typeof username == 'undefined' || username === null) {
            response = {};
            response.result = 'fail';
            response.message = 'request did not come from a valid username';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        let game_id = player.room;
        if (typeof game_id == 'undefined' || game_id === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid game_id';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        let row = payload.row;
        if (typeof row == 'undefined' || row === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid row';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        let column = payload.column;
        if (typeof column == 'undefined' || column === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid column';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        let color = payload.color;
        if (typeof color == 'undefined' || color === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid color';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        let game = games[game_id];
        if (typeof game == 'undefined' || game === null) {
            response = {};
            response.result = 'fail';
            response.message = 'Client did not send a valid game';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        let response = {};
        response.result = 'success'
        socket.emit('play_token_response', response);

        if(color === 'blue'){
            game.game_board[row][column] = 'b';
            game.whose_turn = 'yellow';
        }
        else if (color === 'yellow'){
            game.game_board[row][column] = 'y';
            game.whose_turn = 'blue';
        }

        send_game_update(socket, game_id, "played a token")
    });
})

function send_game_update(socket, game_id, message) {
    if (typeof games[game_id] == 'undefined' || games[game_id] === null) {
        console.log("No game exists with game_id: " + game_id + ". Making new game for socket " + socket.id)
        games[game_id] = create_new_game();
    }

    io.of('/').to(game_id).allSockets().then((sockets) => {
        const iterator = sockets[Symbol.iterator]();
        if (sockets.size >= 1) {
            let first = iterator.next().value;
            if (games[game_id].player_blue.socket != first &&
                games[game_id].player_yellow.socket != first) {
                if (games[game_id].player_blue.socket === '') {
                    console.log("Blue is assigned to " + first);
                    games[game_id].player_blue.socket = first;
                    games[game_id].player_blue.username = players[first].username;
                }
                else if (games[game_id].player_yellow.socket === '') {
                    console.log("Yellow is assigned to " + first);
                    games[game_id].player_yellow.socket = first;
                    games[game_id].player_yellow.username = players[first].username;
                }
                else {
                    console.log("Kicking " + first + " out of the game " + game_id);
                    io.in(first).socketsLeave([game_id]);
                }
            }
        }
        if (sockets.size >= 2) {
            let second = iterator.next().value;
            if (games[game_id].player_blue.socket != second &&
                games[game_id].player_yellow.socket != second) {
                if (games[game_id].player_blue.socket === '') {
                    console.log("Blue is assigned to " + second);
                    games[game_id].player_blue.socket = second;
                    games[game_id].player_blue.username = players[second].username;
                }
                else if (games[game_id].player_yellow.socket === '') {
                    console.log("Yellow is assigned to " + second);
                    games[game_id].player_yellow.socket = second;
                    games[game_id].player_yellow.username = players[second].username;
                }
                else {
                    console.log("Kicking " + second + " out of the game " + game_id);
                    io.in(second).socketsLeave([game_id]);
                }
            }
        }
        let payload = {
            result: 'success',
            game_id: game_id,
            game: games[game_id],
            message: message
        }
        io.of('/').to(game_id).emit('game_update', payload);
    })

    let ended = true;
    for (let row = 0; row < 8; row++){
        for (let col = 0; col < 8; col++){
            if (games[game_id].game_board[row][col] === ' '){
                ended = false;
            }
        }
    }
    if(ended){
        let payload = {
            result : 'success',
            game_id : game_id,
            game: games[game_id],
            who_won: 'everyone'
        }
        io.in(game_id).emit('game_over', payload);

        setTimeout(
            ((id) => {
                return (()=>{
                    delete games[id];
                });
            })(game_id), 60*60*1000
        );
    }
}

function create_new_game() {
    let new_game = {};
    new_game.player_blue = {};
    new_game.player_blue.socket = '';
    new_game.player_blue.username = '';
    new_game.player_yellow = {};
    new_game.player_yellow.socket = '';
    new_game.player_yellow.username = '';

    var d = new Date();
    new_game.last_move_time = d.getTime();

    new_game.whose_turn = 'blue';

    new_game.game_board = [
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', 'b', 'y', ' ', ' ', ' '],
        [' ', ' ', ' ', 'y', 'b', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ]
    return new_game;
}
