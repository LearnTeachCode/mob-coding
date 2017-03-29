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

// When a user connects over websocket,
io.on('connection', function(socket){

	// Display this message in the server console
	console.log('A user connected!');

	// When a user disconnects, display message in server console
	socket.on('disconnect', function(){
		console.log('A user disconnected!');
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

		// TODO:
			// updatePlayerList() 

		socket.broadcast.emit('playerListChange', data);
	});

	// TO DO:
		// implement 'turnChange' event with timer!
		// send event to ALL clients at the right time

	// TO DO:
		// implement updatePlayerList
		// track: IDs, names, current turn, next turn

});	// End of SocketIO part of the code