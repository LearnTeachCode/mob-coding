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
var nextTurnChangeTimestamp;
var currentPlayerIndex;
const turnDuration = 5000;

// When a user connects over websocket,
io.on('connection', function(socket){
	
	console.log('A user connected!');	
	
	// Add user ID/name to playerList as soon as they connect
	playerData[socket.id] = 'Anonymous-' + socket.id.slice(0,4);
	playerList.push(socket.id);

	// Broadcast updated playerList to ALL clients
	io.emit('playerListChange', playerData);

	// When first user connects (if turn timer isn't already running):
	if (!timerId) {
		console.log('Initializing turn timer!');

		// Initialize time of next turn change (will use this to sync the clients)
		nextTurnChangeTimestamp = Date.now() + turnDuration;

		console.log( new Date(nextTurnChangeTimestamp).toString() )

		// Initialize the turn data when first user connects
		changeTurn(socket.id);		

		// Every time the timer goes off, change turn again and broadcast the data
		timerId = setInterval(() => {	  			  		
	  		console.log('Time to change turns!');

	  		// Update time of next turn change
	  		nextTurnChangeTimestamp = Date.now() + turnDuration;

			changeTurn(socket.id);

			// Broadcast turnChange with data to ALL clients
			io.emit( 'turnChange', getTurnData() );

			console.log( getTurnData() );
		}, turnDuration); // TO DO: enable user-specified turn length
	}
		
	// Also broadcast current turn data to the one client who just connected
	socket.emit( 'turnChange', getTurnData() );

	console.log('----------------- initial turnData broadcasted:');
	console.log( getTurnData() );

	console.log(' ! ! !   ! ! !   player data and list   ! ! !    ! ! !');
	console.log(playerData);
	console.log(playerList);

	// ------------------------- OTHER EVENTS ----------------------------------

	// When a user disconnects,
	socket.on('disconnect', function(){
		
		console.log('A user disconnected!');		

		// Remove from playerList
		delete playerData[socket.id];
		playerList.splice( playerList.indexOf(socket.id), 1);

		// Broadcast updated playerList
		socket.broadcast.emit('playerListChange', playerData);

		// If no players are left, reset the game!
		if (playerList.length === 0) {
			console.log('No players left. Turning off the turn timer!');
			currentPlayerIndex = null;
			clearInterval(timerId);
			timerId = null;
			nextTurnChangeTimestamp = null;
		}

		console.log(playerData);
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



/* -------------------------------------------------
	FUNCTIONS
---------------------------------------------------- */

function changeTurn(socketId) {
	// If current client is first player, initialize!	  		
	if (currentPlayerIndex == null) {
		console.log('*************** INITIALIZING FIRST PLAYER **************');
		currentPlayerIndex = playerList.indexOf(socketId);
		console.log('currentPlayerIndex: ' + currentPlayerIndex);
	// Otherwise, increment the current player
	} else if (playerList.length > 1) {	  			
		console.log('+ + + Incrementing currentPlayerIndex + + +');
		currentPlayerIndex = (currentPlayerIndex + 1) % playerList.length;
		console.log('NEW currentPlayerIndex: ' + currentPlayerIndex);
	}
}

// Returns turnChange object for the current turn
function getTurnData() {
	var currentPlayerId = playerList[currentPlayerIndex];
	var currentPlayerName = playerData[currentPlayerId];
	
	var nextPlayerIndex = (currentPlayerIndex + 1) % playerList.length;
	
	var nextPlayerId = playerList[nextPlayerIndex];
	var nextPlayerName = playerData[nextPlayerId];

	return {millisRemaining: nextTurnChangeTimestamp - Date.now(), current: {id: currentPlayerId, name: currentPlayerName}, next: {id: nextPlayerId, name: nextPlayerName}};
}