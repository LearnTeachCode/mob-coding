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
	- loggedIn			io.emit: playerListChange
						socket.emit: editorChange, changeScroll, changeCursor, turnChange

	- disconnect 		Broadcast: playerListChange
	- userNameChange	Broadcast: playerListChange

	- editorChange		Broadcast: editorChange
	- changeCursor		Broadcast: changeCursor
	- changeScroll		Broadcast: changeScroll
	- turnChange 		Broadcast: turnChange
-------------------------------------------------------------- */

var playerData = {};
var playerList = [];

var editorContent = '// Type JavaScript here!';
var editorCursorAndSelection;
var editorScroll;

var timerId;
var nextTurnChangeTimestamp;
var currentPlayerIndex;
const turnDuration = 30000;

// When a user connects over websocket,
io.on('connection', function (socket) {
	
	console.log('A user connected! (But not yet logged in.)');	
	
	// When a user logs in,
	socket.on('loggedIn', function (userName) {
		// Add user ID/name to playerList
		playerData[socket.id] = 'userName';
		playerList.push(socket.id);

		// Send current state of the text editor to the new client, to initialize!
		socket.emit('editorChange', editorContent);
		if (editorScroll != null) {
			socket.emit('changeScroll', editorScroll);
		}
		if (editorCursorAndSelection != null) {
			socket.emit('changeCursor', editorCursorAndSelection);
		}

		// Initialize the turn (and timer) with first connected user
		timerId = startTurnTimer(timerId, turnDuration, socket.id);
			
		// Broadcast current turn data to the one client who just connected
		socket.emit( 'turnChange', getTurnData() );

		// Broadcast updated playerList to ALL clients
		io.emit('playerListChange', playerData);

		console.log('----------------- initial turnData broadcasted:');
		console.log( getTurnData() );

		console.log(' ! ! !   ! ! !   player data and list   ! ! !    ! ! !');
		console.log(playerData);
		console.log(playerList);
	});	

	// When a user disconnects,
	socket.on('disconnect', function() {
		
		console.log('A user disconnected!');		

		// Temporarily save ID of current player
		var currentPlayerId = playerList[currentPlayerIndex];

		// Remove from playerList
		delete playerData[socket.id];
		playerList.splice( playerList.indexOf(socket.id), 1);

		// Broadcast updated playerList
		socket.broadcast.emit('playerListChange', playerData);

		// If no players are left, reset the game!
		if (playerList.length === 0) {
			console.log('No players left. Turning off the turn timer!');
			currentPlayerIndex = null;
			
			// Turn off the timer
			clearInterval(timerId);
			timerId = null;
			nextTurnChangeTimestamp = null;
		
		// Otherwise, if the disconnected user was the current player, restart timer and change the turn!
		} else if (socket.id === currentPlayerId) {
			console.log('~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ CURRENT PLAYER disconnected! Restarting turn/timer.');
			// Turn off the timer
			clearInterval(timerId);
			timerId = null;
			nextTurnChangeTimestamp = null;

			// Re-initialize the turn (and timer), passing control to the next user
			timerId = startTurnTimer(timerId, turnDuration, socket.id);			
		}		

		// Broadcast current turn data to update all other clients
		socket.broadcast.emit( 'turnChange', getTurnData() );

		console.log(playerData);
		console.log(playerList);
	});

	// When "editorChange" event received, update editor state and broadcast it back out
	socket.on('editorChange', function (data) {
		
		console.log('editorChange event received!');
		console.log(data);

		// Double check that this user is allowed to type (in case of client-side tampering with the JS!)
		if (socket.id === playerList[currentPlayerIndex]) {			
			// Update saved state of the shared text editor
			editorContent = data;

			// Broadcast updated editor content to other clients
			socket.broadcast.emit('editorChange', editorContent);

			console.log('Broadcasting editorContent to other clients!');
		}
		
	});

	// When "changeCursor" event received, update editor state and broadcast it back out
	socket.on('changeCursor', function (data) {
		
		console.log('changeCursor event received!');
		console.log(data);

		// Double check that this user is allowed to broadcast (in case of client-side tampering with the JS!)
		if (socket.id === playerList[currentPlayerIndex]) {			
			// Update saved state of the shared text editor
			editorCursorAndSelection = data;

			// Broadcast data to other clients
			socket.broadcast.emit('changeCursor', editorCursorAndSelection);

			console.log('Broadcasting changeCursor to other clients!');
		}
		
	});

	// When "changeScroll" event received, update editor state and broadcast it back out
	socket.on('changeScroll', function (data) {
		
		console.log('changeScroll event received!');
		console.log(data);

		// Double check that this user is allowed to broadcast (in case of client-side tampering with the JS!)
		if (socket.id === playerList[currentPlayerIndex]) {			
			// Update saved state of the shared text editor
			editorScroll = data;

			// Broadcast data to other clients
			socket.broadcast.emit('changeScroll', editorScroll);

			console.log('Broadcasting changeScroll to other clients!');
		}
		
	});

	// When "userNameChange" event received, broadcast it back out
	socket.on('userNameChange', function (data) {
		
		console.log('userNameChange event received!');
		console.log(data);		

		// Update name property of this client in playerList
		playerData[socket.id] = data;

		// Broadcast updated playerList
		socket.broadcast.emit('playerListChange', playerData);

		console.log('updated playerData: ');
		console.log(playerData);
	});

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
	} else {	  			
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

// Initializes the turn and turn timer, returns timerId
function startTurnTimer(timerId, turnDuration, socketId) {
	// If turn timer isn't already running
	if (!timerId) {
		console.log('Initializing turn timer!');

		// Initialize time of next turn change (will use this to sync the clients)
		nextTurnChangeTimestamp = Date.now() + turnDuration;

		console.log( new Date(nextTurnChangeTimestamp).toString() )

		// Initialize the turn data using given user ID
		changeTurn(socketId);		

		// Every time the timer goes off, change turn again and broadcast the data
		timerId = setInterval(() => {	  			  		
	  		console.log('Time to change turns!');

	  		// Update time of next turn change
	  		nextTurnChangeTimestamp = Date.now() + turnDuration;

			changeTurn(socketId);

			// Broadcast turnChange with data to ALL clients
			io.emit( 'turnChange', getTurnData() );

			console.log( getTurnData() );
		}, turnDuration); // TO DO: enable user-specified turn length
	}
	return timerId;
}