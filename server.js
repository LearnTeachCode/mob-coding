// Setting up libraries and configuration
require('dotenv').config();				// Loads variables from .env file into process.env
var express = require('express');		// The require() function includes the code for Express
var app = express();					// Initialize the Express library
var http = require('http');				// Get access to Node's http methods!
var https = require('https');			// ... and https methods!
var server = http.Server(app);			// Initialize an Express HTTP server
var io = require('socket.io')(server);	// Include and initialize SocketIO
var port = process.env.PORT || 8000;	// Set the default port number to 8000, or use Heroku's settings (process.env.PORT)

// Use Express to serve everything in the "public" folder as static files
app.use(express.static('public'));

// Pass GITHUB_CLIENT_ID to client when requested (using AJAX for now)
	// TODO (later): mess around with templating engines and Express .render()?
app.get('/github-client', function (req, res) {
	console.log('Request received for /github-client route. Sending response: GITHUB_CLIENT_ID');
	res.end(process.env.GITHUB_CLIENT_ID);
});

// Handle GitHub authentication at this route, then redirect to homepage
app.get('/github-auth', authenticateUser);

function authenticateUser (req, res) {

	// TO DO: use "state" param and verify it for extra security!

	// Make a POST request to https://github.com/login/oauth/access_token	
	var githubResponseBody = '';
	var postRequestBody = 'client_id=' + process.env.GITHUB_CLIENT_ID + '&client_secret=' + process.env.GITHUB_CLIENT_SECRET + '&code=' + req.query.code;

	var request = https.request({
	  hostname: 'github.com', 
	  path: '/login/oauth/access_token',
	  port: '443',
	  method: 'POST',
	  headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postRequestBody),
          'Accept': 'application/json'
      }	 
	}, function(response) {
	  response.on('data', function(chunk) {
	    githubResponseBody += chunk;	    
	  });
	  response.on('end', function() {	    
	    //console.log('\n*****done receiving response data:\n' + githubResponseBody + '\n');	    

		// TODO (later): check the scopes, because users can authorize less than what my app requested!

		// Redirect to home page again but now with the access token!
		res.redirect('/?access_token=' + JSON.parse(githubResponseBody).access_token);		
	  });
	});

	request.write(postRequestBody);
	request.end();

}

// Activate the server and listen on our specified port number
server.listen(port, function() {
	// Display this message in the server console once the server is active
	console.log('Listening on port ' + port);
});

/* ------------------------------------------------------------
	GAME STATE:

{
  nextTurnTimestamp,
  turnIndex,
  currentGist: {id, url, owner},
  playerList:
    [
      {id, login,avatar_url}, { ... }, { ... }, ...
    ],
  editor:
    {
      content,
      cursorAndSelection: { cursor: {column, row}, range: { end: {column, row}, start: {column, row} },
      scroll: {scrollLeft, scrollTop}
    }
}

-------------------------------------------------------------- */

let gameState = {
	nextTurnTimestamp: null,
	turnIndex: 0,
	currentGist: null,
	players: [],
	editor:
    {
      content: '// Type JavaScript here!',
      cursorAndSelection: null,
      scroll: null
    }
};

const turnDuration = 60000;
let timerId = null;

/* ----------------------------------------------------------------------------------------------------------------------------------------------
	EVENTS:

Event Name 			Sent By 	Sent To 			Data 						Description
------------------	----------	------------------	--------------------------	-----------------------------------------------------------------
playerJoined 		Client 		Server 				{login, avatar_url} 		When new player completes login process
playerJoined 		Server 		All other clients 	{id, login, avatar_url} 	Update other clients with new player data
gameState 			Server 		One client 			See game state model! 		Initialize game state for new player that just logged in,
																					and trigger new gist creation if game is just starting!
playerLeft 			Server 		All other clients 	id 							Update other clients to remove disconnected player
turnChange 			Server 		All clients 		null ??? 					Trigger clients to change the turn
newGist 			Client 		Server 				{id, url, owner} 			Broadcast new Gist data
editorTextChange	Client 		Server 				"just a string!" 			Broadcast changes to code editor content
editorScrollChange 	Client 		Server 				{scrollLeft, scrollTop} 	Broadcast changes to code editor content
editorCursorChange 	Client 		Server 				{ 							Broadcast cursor moves or selection changes
														cursor: {column, row},
														range: {
															end: {column, row},
															start: {column, row}
														}
													}	
disconnect 			Client 		Server 				... 						When clients disconnect from server (SocketIO function)
connection 			Client 		Server 				... 						When clients connect to server (SocketIO function)
------------------------------------------------------------------------------------------------------------------------------------------------- */

// When a user connects over websocket,
io.on('connection', function (socket) {
	
	console.log('\nA user connected! (But not yet logged in.)\n');		

	// When a player logs in,
	socket.on('playerJoined', function (playerData) {
		console.log('\n* * * * # # # #  User logged in!  # # # # * * * * *');
		console.log('\t\t > > > ' + playerData.login + ' < < <\n');		

		// Add new player
		gameState.players.push({id: socket.id, login: playerData.login, avatar_url: playerData.avatar_url});
		
		// If there is 1 player logged in, START THE GAME!!!
		if (gameState.players.length === 1) {
			timerId = startTurnTimer(timerId, turnDuration);
		}

		// Initialize new player
		socket.emit('gameState', gameState);

		// Broadcast new player data to all OTHER clients
		socket.broadcast.emit('playerJoined', {id: socket.id, login: playerData.login, avatar_url: playerData.avatar_url});

	});

	// When a player disconnects,
	socket.on('disconnect', function() {
		
		console.log('\nA user disconnected!\n');

		// If disconnected player was logged in,
		if (getPlayerById(socket.id, gameState.players) !== -1) {

			console.log('\n\t User removed from list of logged-in players. ID: ' + socket.id);

			// Broadcast the disconnected player's ID to update all other clients
			socket.broadcast.emit( 'playerLeft', socket.id );

			// Temporarily save ID of current player (before removing from player list, for a later check!)
			var currentPlayerId = getCurrentPlayer().id;

			// Remove disconnected player from player list
			removePlayer(socket.id, gameState.players);

			// If no logged-in players are left, reset the game!
			if (gameState.players.length === 0) {
				console.log('\nNo players left. Turning off the turn timer!\n');
				
				// Turn off the timer
				clearInterval(timerId);
			
			// Otherwise, if there are players left, and the disconnected player was the current player, restart timer and change the turn!
			} else if (socket.id === currentPlayerId) {
					console.log('\nCURRENT PLAYER disconnected! Restarting turn/timer.\n');
					
					// Turn off the timer
					clearInterval(timerId);

					// Restart the timer
					timerId = startTurnTimer(timerId, turnDuration);

					// Change the turn, including ID of disconnected player to send to clients
					changeTurn(socket.id);
			}

		} else {
			console.log('\n\t User was not yet logged in, so no action taken.\n');
		}	
	});

	// When "editorTextChange" event received, update editor state and broadcast it back out
	socket.on('editorTextChange', function (data) {

		// Double check that this user is allowed to type (in case of client-side tampering with the JS!)
		if ( socket.id === getCurrentPlayer().id ) {
			// Update saved state of the shared text editor
			gameState.editor.content = data;

			// Broadcast updated editor content to other clients
			socket.broadcast.emit('editorTextChange', gameState.editor.content);
		}
	});

	// When "editorCursorChange" event received, update editor state and broadcast it back out
	socket.on('editorCursorChange', function (data) {

		// Double check that this user is allowed to broadcast (in case of client-side tampering with the JS!)
		if (socket.id === getCurrentPlayer().id ) {
			// Update saved state of the shared text editor
			gameState.editor.cursorAndSelection = data;

			// Broadcast data to other clients
			socket.broadcast.emit('editorCursorChange', gameState.editor.cursorAndSelection);
		}
	});

	// When "editorScrollChange" event received, update editor state and broadcast it back out
	socket.on('editorScrollChange', function (data) {
		
		// Double check that this user is allowed to broadcast (in case of client-side tampering with the JS!)
		if (socket.id === getCurrentPlayer().id ) {
			// Update saved state of the shared text editor
			gameState.editor.scroll = data;

			// Broadcast data to other clients
			socket.broadcast.emit('editorScrollChange', gameState.editor.cursorAndSelection);
		}	
	});

	// When "newGist" event received, update state and broadcast it back out
	socket.on('newGist', function (data) {
		
		// Double check that this user is allowed to broadcast a new gist!
		if (socket.id === getPreviousPlayer().id) {
			console.log('\nnewGist event received!\n');
			//console.log(data);

			gameState.currentGist = data;

			// Broadcast data to other clients
			socket.broadcast.emit('newGist', data);
		}
	});

});	// End of SocketIO part of the code


/* -------------------------------------------------
	FUNCTIONS
---------------------------------------------------- */
function changeTurn(disconnectedPlayerId) {
	gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
	
	// Broadcast turnChange to ALL clients, with disconnected player ID (which exists only if current player disconnected):
	io.emit('turnChange', disconnectedPlayerId);
}

// Initializes the turn and turn timer, returns timerId
function startTurnTimer(timerId, turnDuration) {
	console.log('\nInitializing turn timer!');

	// Initialize or reset time remaining
	gameState.nextTurnTimestamp = Date.now() + turnDuration;

	console.log( 'Next turn at: ' + new Date(gameState.nextTurnTimestamp).toString().substring(16,25) );

	// Every time the timer goes off, update timestamp and change turn!
	timerId = setInterval(() => {
		console.log('\n >>>>>>>>>>>  ' + new Date().toString().substring(16,25)	+ ' - Time to change turns!  <<<<<<<<<<\n');

		// Update time of next turn change
		gameState.nextTurnTimestamp = Date.now() + turnDuration;

		changeTurn();

	}, turnDuration); // TO DO: enable user-specified turn length

	return timerId;
}

// Helper functions, just in case:
function getCurrentPlayer() {
	return gameState.players[gameState.turnIndex];
}

function getPreviousPlayer() {
	var previousPlayerIndex = (gameState.turnIndex + gameState.players.length - 1) % gameState.players.length;
	return gameState.players[previousPlayerIndex];
}

function getPlayerById(id, playerList){
	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].id === id) {
			return playerList[i];
		}
	}
	return -1;
}
function getPlayerIndexById(id, playerList) {
	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].id === id) {
			return i;
		}
	}
	return -1;
}
function removePlayer(id, playerList) {
	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].id === id) {
			playerList.splice(i, 1);
		}
	}
}