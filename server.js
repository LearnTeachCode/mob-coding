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
						***updatePlayerListView

	- disconnect 		Broadcast: playerListChange
						***updatePlayerListView

	- userNameChange	Broadcast: playerListChange
						*** updatePlayerListView

	- editorChange		Broadcast: editorChange
-------------------------------------------------------------- */

var playerList = {};
var editorContent = '';

// When a user connects over websocket,
io.on('connection', function(socket){

	// Display this message in the server console
	console.log('A user connected!');	
	
	// Add user ID/name to playerList as soon as they connect
	playerList[socket.id] = 'Anonymous-' + socket.id.slice(0,4);

	// Broadcast updated playerList to ALL clients
	io.emit('playerListChange', playerList);
	
	console.log(playerList);

	// Send current state of the text editor to the new client, to initialize!
	socket.emit('editorChange', editorContent);

	// When a user disconnects,
	socket.on('disconnect', function(){
		
		console.log('A user disconnected!');		

		// Remove from playerList
		delete playerList[socket.id];

		// Broadcast updated playerList
		socket.broadcast.emit('playerListChange', playerList);

		console.log(playerList);
	});

	// When "editorChange" event received, update editor state and broadcast it back out
	socket.on('editorChange', function(data) {
		
		console.log('editorChange event received!');
		console.log(data);

		// Update saved state of the shared text editor
		editorContent = data;

		socket.broadcast.emit('editorChange', editorContent);
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

});	// End of SocketIO part of the code