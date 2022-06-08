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
        let response = {};
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

        if (color !== game.whose_turn) {
            response = {};
            response.result = 'fail';
            response.message = 'Wrong color, it\'s not your turn yet';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        if ((game.whose_turn === "blue" && game.player_blue.socket != socket.id) ||
            (game.whose_turn === "yellow" && game.player_yellow.socket != socket.id)) {
            response = {};
            response.result = 'fail';
            response.message = 'Right color but sent from wrong player';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed', JSON.stringify(response));
            return;
        }

        response.result = 'success'
        socket.emit('play_token_response', response);

        if (color === 'blue') {
            game.game_board[row][column] = 'b';
            flip_tokens('b', row, column, game.game_board);
            game.whose_turn = 'yellow';
            game.legal_moves = calculate_legal_moves('y', game.game_board);
        }
        else if (color === 'yellow') {
            game.game_board[row][column] = 'y';
            flip_tokens('y', row, column, game.game_board);
            game.whose_turn = 'blue';
            game.legal_moves = calculate_legal_moves('b', game.game_board);
        }

        let d = new Date();
        game.last_move_time = d.getTime();
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

    let legal_moves = 0;
    let bluesum = 0;
    let yellowsum = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (games[game_id].legal_moves[row][col] !== ' ') {
                legal_moves += 1;
            }
            if (games[game_id].game_board[row][col] === 'b') {
                bluesum += 1;
            }
            if (games[game_id].game_board[row][col] === 'y') {
                yellowsum += 1;
            }
        }
    }
    if (legal_moves === 0) {
        let winner = 'Tie Game';
        if (bluesum > yellowsum){
            winner = 'blue';
        }
        if (yellowsum > bluesum){
            winner = 'yellow';
        }

        let payload = {
            result: 'success',
            game_id: game_id,
            game: games[game_id],
            who_won: winner
        }
        io.in(game_id).emit('game_over', payload);

        setTimeout(
            ((id) => {
                return (() => {
                    delete games[id];
                });
            })(game_id), 60 * 60 * 1000
        );
    }
}

function check_line_match(color, dr, dc, r, c, board){
    if(r < 0 || r > 7 || c < 0 || c > 7){
        return false;
    }
    if (board[r][c] === color){
        return true;
    }
    if (board[r][c] === ' '){
        return false;
    }
    return check_line_match(color, dr, dc, r + dr, c + dc, board);
}

function adjacent_support(who, dr, dc, r, c, board){
    let other;
    if (who === 'b'){
        other = 'y';
    } 
    else if (who === 'y'){
        other = 'b';
    }

    if(r + dr < 0 || r + dr > 7 || c + dc < 0 || c + dc > 7){
        return false;
    }

    if (board[r + dr][c + dc] !== other){
        return false;
    }

    return check_line_match(who, dr, dc, r + dr + dr, c + dc + dc, board);
}

function calculate_legal_moves(who, board) {
    let legal_moves = [
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ];

    console.log(board)
    for (let row = 0; row < 8; row++) {
        for (let column = 0; column < 8; column++) {
            if (board[row][column] === ' ') {
                nw = adjacent_support(who, -1, -1, row, column, board);
                nn = adjacent_support(who, -1, 0, row, column, board);
                ne = adjacent_support(who, -1, 1, row, column, board);

                ww = adjacent_support(who, 0, -1, row, column, board);
                ee = adjacent_support(who, 0, 1, row, column, board);

                sw = adjacent_support(who, 1, -1, row, column, board);
                ss = adjacent_support(who, 1, 0, row, column, board);
                se = adjacent_support(who, 1, 1, row, column, board);
                if (nw || nn || ne || ww || ee || sw || ss || se) {
                    legal_moves[row][column] = who;
                }
            }
        }
    }
    return legal_moves;
}

function flip_line(who, dr, dc, r, c, board){
    if(r + dr < 0 || r + dr > 7 || c + dc < 0 || c + dc > 7){
        return false;
    }

    if (board[r + dr][c + dc] === ' '){
        return false;
    }

    if (board[r + dr][c + dc] === who){
        return true;
    }

    if (flip_line(who, dr, dc, r + dr, c + dc, board)){
        board[r + dr][c + dc] = who;
        return true;
    } else{
        return false;
    }
}

function flip_tokens(who, row, column, board){
    flip_line(who, -1, -1, row, column, board);
    flip_line(who, -1, 0, row, column, board);
    flip_line(who, -1, 1, row, column, board);

    flip_line(who, 0, -1, row, column, board);
    flip_line(who, 0, 1, row, column, board);

    flip_line(who, 1, -1, row, column, board);
    flip_line(who, 1, 0, row, column, board);
    flip_line(who, 1, 1, row, column, board);

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
        [' ', ' ', ' ', 'y', 'b', ' ', ' ', ' '],
        [' ', ' ', ' ', 'b', 'y', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ]

    new_game.legal_moves = calculate_legal_moves('b', new_game.game_board);
    return new_game;
}
