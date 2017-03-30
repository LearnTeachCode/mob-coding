// Setting up libraries and configuration
var express = require('express');		// The require() function includes the code for Express
var app = express();					// Initialize the Express library
var http = require('http').Server(app);	// Initialize an HTTP server
var io = require('socket.io')(http);	// Include and initialize SocketIO
var port = process.env.PORT || 8000;	// Set the default port number to 8000, or use Heroku's settings (process.env.PORT)

// Use Express to serve everything in the "public" folder as static files
app.use(express.static('public'));

// Activate the server and listen on our specified port number
http.listen(port, function() {
	// Display this message in the server console once the server is active
	console.log('Listening on port ' + port);
});


/* ------------------------------------------------------------
	EVENT NAMES: 		SERVER FUNCTIONS:

	- connection 		Broadcast: playerListChange
						***updatePlayerList

	- disconnect 		Broadcast: playerListChange
						***updatePlayerList

	- userNameChange	Broadcast: playerListChange
						*** updatePlayerList

	- editorChange		Broadcast: editorChange				

	- turnChange 		Broadcast: turnChange
-------------------------------------------------------------- */

var playerList = {};

// When a user connects over websocket,
io.on('connection', function(socket){

	// Display this message in the server console
	console.log('A user connected!');	
	
	// Add user ID/name to playerList as soon as they connect
	playerList[socket.id] = 'Anonymous-' + socket.id.slice(0,4);

	// Broadcast updated playerList
	socket.broadcast.emit('playerListChange', playerList);

	console.log(playerList);

	// ------------------------- OTHER EVENTS ----------------------------------

	// When a user disconnects,
	socket.on('disconnect', function(){
		
		console.log('A user disconnected!');		

		// Remove from playerList
		delete playerList[socket.id];

		// Broadcast updated playerList
		socket.broadcast.emit('playerListChange', playerList);

		console.log(playerList);
	});

	// When "editorChange" event received, broadcast it back out
	socket.on('editorChange', function(data) {
		
		console.log('editorChange event received!');
		console.log(data);

		socket.broadcast.emit('editorChange', data);
	});

	// When "userNameChange" event received, broadcast it back out
	socket.on('userNameChange', function(data) {
		
		console.log('userNameChange event received!');
		console.log(data);		

		// Update name property of this client in playerList
		playerList[socket.id] = data;

		// Broadcast updated playerList
		socket.broadcast.emit('playerListChange', playerList);

		console.log('updated playerList: ');
		console.log(playerList);
	});

	// TO DO:
		// implement 'turnChange' event with timer!
		// track: current turn and next turn!
		// send event to ALL clients at the right time

});	// End of SocketIO part of the code