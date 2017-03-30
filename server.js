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

var playerData = {};
var playerList = [];
var timerId;
var currentPlayerIndex;

// When a user connects over websocket,
io.on('connection', function(socket){

	// Display this message in the server console
	console.log('A user connected!');	
	

	// Start turn timer when first user connects, if it isn't already running:
	if (!timerId) {
		console.log('Initializing turn timer!');

		timerId = setInterval(() => {	  		

	  		// CHANGE THE TURN AND BROADCAST TO CLIENTS

	  		console.log('Time to change turns!');
	  		
	  		// If current client is first player, initialize!	  		
	  		if (currentPlayerIndex == null) {
	  			console.log('**** INITIALIZING FIRST PLAYER ******');
	  			currentPlayerIndex = playerList.indexOf(socket.id);
	  			console.log('currentPlayerIndex: ' + currentPlayerIndex);
	  		// Otherwise, increment the current player
	  		} else if (playerList.length > 1) {	  			
	  			console.log('**** incrementing current player ++++ ******');
	  			currentPlayerIndex = (currentPlayerIndex + 1) % playerList.length;
	  			console.log('NEW currentPlayerIndex: ' + currentPlayerIndex);
	  		}

  			// Get other indeces, ids, and names
  			var currentPlayerId = playerList[currentPlayerIndex];
  			var currentPlayerName = playerData[currentPlayerId];
  			console.log('now updating nextPlayerIndex, and currentPlayerIndex is: ' + currentPlayerIndex);
  			var nextPlayerIndex = (currentPlayerIndex + 1) % playerList.length;
  			console.log('NEW nextPlayer is: ' + nextPlayerIndex);
  			var nextPlayerId = playerList[nextPlayerIndex];
  			var nextPlayerName = playerData[nextPlayerId];

	  		// Broadcast turnChange with data to ALL clients
			io.emit('turnChange', {current: {id: currentPlayerId, name: currentPlayerName}, next: {id: nextPlayerId, name: nextPlayerName}});

			//console.log({current: {id: currentPlayerId, name: currentPlayerName}, next: {id: nextPlayerId, name: nextPlayerName}});

		}, 1500);
	}
	

	// Add user ID/name to playerList as soon as they connect
	playerData[socket.id] = 'Anonymous-' + socket.id.slice(0,4);
	playerList.push(socket.id);

	// Broadcast updated playerList to ALL clients
	io.emit('playerListChange', playerData);

	// TO DO: when new client connects, send them turn data!	

	console.log(playerData);
	console.log(playerList);

	// ------------------------- OTHER EVENTS ----------------------------------

	// When a user disconnects,
	socket.on('disconnect', function(){
		
		console.log('A user disconnected!');		

		// Remove from playerList
		delete playerData[socket.id];
		playerList.slice( playerList.indexOf(socket.id), 1);

		// Broadcast updated playerList
		socket.broadcast.emit('playerListChange', playerList);

		// If no players are left, reset the game!
		if (playerList.length === 0) {
			console.log('No players left. Turning off the turn timer!');
			currentPlayerIndex = null;
			clearInterval(timerId);
			timerId = null;
		}

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
		playerData[socket.id] = data;

		// Broadcast updated playerList
		socket.broadcast.emit('playerListChange', playerData);

		console.log('updated playerData: ');
		console.log(playerData);
	});

	// TO DO:
		// implement 'turnChange' event with timer!
		// track: current turn and next turn!
		// send event to ALL clients at the right time

});	// End of SocketIO part of the code