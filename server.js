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
	EVENT NAMES: 		SERVER FUNCTIONS:			
	- userLogin			io.emit: playerListChange
						socket.emit: editorTextChange, editorScrollChange, editorCursorChange, turnChange
	- disconnect 		Broadcast: playerListChange
	- editorTextChange		Broadcast: editorTextChange
	- editorCursorChange		Broadcast: editorCursorChange
	- editorScrollChange		Broadcast: editorScrollChange
	- updateState		Broadcast: updateState
	- turnChange 		Broadcast: turnChange
	- createNewGist		Broadcast: createNewGist
	- newGistLink		Broadcast: newGistLink	
-------------------------------------------------------------- */

// playerData:
// { 'socket-id-here': {login: 'username-here', avatar_url: 'user-avatar-url-here'} }

var playerData = {};
var playerList = [];

var editorContent = '// Type JavaScript here!';
var editorCursorAndSelection;
var editorScroll;

var currentGist;

var timerId;
var nextTurnChangeTimestamp;
var currentPlayerIndex;
const turnDuration = 60000;	// 3 min: 180000

// When a user connects over websocket,
io.on('connection', function (socket) {
	
	console.log('\nA user connected! (But not yet logged in.)\n');	
	//console.log('\t\t playerList.length: ' + playerList.length);

	// When a user logs in,
	socket.on('userLogin', function (userData) {
		console.log('\n* * * * # # # #  User logged in!  # # # # * * * * *');
		console.log('\t\t > > > ' + userData.login + ' < < <\n');
		//console.log('\t\t playerList.length: ' + playerList.length);

		// Add user ID/name to playerList
		playerData[socket.id] = {};
		playerData[socket.id].login = userData.login;
		playerData[socket.id].avatar_url = userData.avatar_url;
		playerList.push(socket.id);

		// Send current state of the text editor to the new client, to initialize!
		socket.emit('editorTextChange', editorContent);
		if (editorScroll != null) {
			socket.emit('editorScrollChange', editorScroll);
		}
		if (editorCursorAndSelection != null) {
			socket.emit('editorCursorChange', editorCursorAndSelection);
		}
		
		// If there is 1 player logged in (the first player to join, who just triggered the "userLogin" event),
		// START THE GAME!!!
		if (playerList.length === 1) {
			timerId = startTurnTimer(timerId, turnDuration, socket.id);
			
			// Notify the first user to create a new gist now!
			socket.emit('createNewGist', null);
		}
			
		// Broadcast current turn data to all clients (for the case where nextPlayerId changes when a second user joins)
		io.emit( 'updateState', getTurnData() );

		// Broadcast updated playerList to ALL clients
		io.emit('playerListChange', playerData);

		console.log('\non("userLogin") -- turnData broadcasted!\n');
		//console.log( getTurnData() );

		//console.log(' ! ! !   ! ! !   player data and list   ! ! !    ! ! !');
		//console.log(playerData);
		//console.log(playerList);
		//console.log('\t\t playerList.length: ' + playerList.length);
	});	

	// When a user disconnects,
	socket.on('disconnect', function() {
		
		console.log('\nA user disconnected!\n');	
		//console.log('currentPlayerIndex: ' + currentPlayerIndex);

		// If disconnected user was logged in,
		if (playerList.indexOf(socket.id) !== -1) {
			console.log('\n\t User removed from list of logged-in players. ID: ' + socket.id);

			// Temporarily save ID of current player (before removing from playerList, for a later check!)
			var currentPlayerId = playerList[currentPlayerIndex];

			// Remove disconnected user from playerList
			delete playerData[socket.id];
			playerList.splice( playerList.indexOf(socket.id), 1);			

			// If no logged-in players are left, reset the game!
			if (playerList.length === 0) {
				console.log('\nNo players left. Turning off the turn timer!\n');
				currentPlayerIndex = null;
				
				// Turn off the timer
				clearInterval(timerId);				
				nextTurnChangeTimestamp = null;
			
			// Otherwise, if there are players left,
			} else {
			 	// If the disconnected user was the current player, restart timer and change the turn!
			 	if (socket.id === currentPlayerId) {
					console.log('\nCURRENT PLAYER disconnected! Restarting turn/timer.\n');
					
					// Turn off the timer
					clearInterval(timerId);					
					nextTurnChangeTimestamp = null;

					// Re-initialize the turn (and timer), passing control to the next user
					timerId = startTurnTimer(timerId, turnDuration, socket.id);			
				}

				// Broadcast current turn data to update all other clients
				socket.broadcast.emit( 'updateState', getTurnData() );

				// Broadcast updated playerList to update all other clients
				socket.broadcast.emit('playerListChange', playerData);
			}			 
			
			//console.log('playerData: ');
			//console.log(playerData);
			//console.log('playerList: ');
			//console.log(playerList);

		} else {
			console.log('\n\t User was not yet logged in, so no action taken.\n');
		}		
	});

	// When "editorTextChange" event received, update editor state and broadcast it back out
	socket.on('editorTextChange', function (data) {
		
		//console.log('editorTextChange event received!');
		//console.log(data);

		// Double check that this user is allowed to type (in case of client-side tampering with the JS!)
		if (socket.id === playerList[currentPlayerIndex]) {			
			// Update saved state of the shared text editor
			editorContent = data;

			// Broadcast updated editor content to other clients
			socket.broadcast.emit('editorTextChange', editorContent);

			//console.log('Broadcasting editorContent to other clients!');
		}
		
	});

	// When "editorCursorChange" event received, update editor state and broadcast it back out
	socket.on('editorCursorChange', function (data) {
		
		//console.log('editorCursorChange event received!');
		//console.log(data);

		// Double check that this user is allowed to broadcast (in case of client-side tampering with the JS!)
		if (socket.id === playerList[currentPlayerIndex]) {			
			// Update saved state of the shared text editor
			editorCursorAndSelection = data;

			// Broadcast data to other clients
			socket.broadcast.emit('editorCursorChange', editorCursorAndSelection);

			//console.log('Broadcasting editorCursorChange to other clients!');
		}
		
	});

	// When "editorScrollChange" event received, update editor state and broadcast it back out
	socket.on('editorScrollChange', function (data) {
		
		//console.log('editorScrollChange event received!');
		//console.log(data);

		// Double check that this user is allowed to broadcast (in case of client-side tampering with the JS!)
		if (socket.id === playerList[currentPlayerIndex]) {			
			// Update saved state of the shared text editor
			editorScroll = data;

			// Broadcast data to other clients
			socket.broadcast.emit('editorScrollChange', editorScroll);

			//console.log('Broadcasting editorScrollChange to other clients!');
		}
		
	});

	// When "newGistLink" event received, update state and broadcast it back out
	socket.on('newGistLink', function (data) {
		
		console.log('\nnewGistLink event received!\n');
		//console.log(data);

		currentGist = data;

		// Broadcast data to other clients
		socket.broadcast.emit('newGistLink', data);
		
	});

});	// End of SocketIO part of the code


/* -------------------------------------------------
	FUNCTIONS
---------------------------------------------------- */
function changeTurn(socketId) {
	// If current client is first player, initialize!	  		
	if (currentPlayerIndex == null) {
		console.log('\nINITIALIZING FIRST PLAYER\n');
		currentPlayerIndex = playerList.indexOf(socketId);
		//console.log('currentPlayerIndex: ' + currentPlayerIndex);
	// Otherwise, increment the current player
	} else {	  			
		//console.log('\nIncrementing currentPlayerIndex\n');
		currentPlayerIndex = (currentPlayerIndex + 1) % playerList.length;
		//console.log('NEW currentPlayerIndex: ' + currentPlayerIndex);
	}
}

// Returns turnChange object for the current turn
function getTurnData() {
	//console.log('getTurnData called');
	var currentPlayerId = playerList[currentPlayerIndex];
	var currentPlayerName = playerData[currentPlayerId].login;
	
	var nextPlayerIndex = (currentPlayerIndex + 1) % playerList.length;
	
	var nextPlayerId = playerList[nextPlayerIndex];
	var nextPlayerName = playerData[nextPlayerId].login;	

	return {millisRemaining: nextTurnChangeTimestamp - Date.now(), current: {id: currentPlayerId, name: currentPlayerName}, next: {id: nextPlayerId, name: nextPlayerName}, gist: currentGist};
}

// Initializes the turn and turn timer, returns timerId
function startTurnTimer(timerId, turnDuration, socketId) {
	console.log('\nInitializing turn timer!');

	// Initialize time of next turn change (will use this to sync the clients)
	nextTurnChangeTimestamp = Date.now() + turnDuration;

	console.log( 'Next turn at: ' + new Date(nextTurnChangeTimestamp).toString().substring(16,25) );	

	// Initialize the turn data using given user ID
	changeTurn(socketId);

	// Every time the timer goes off,
	timerId = setInterval(() => {	  			  		
  		console.log('\n >>>>>>>>>>>  ' + new Date().toString().substring(16,25)	+ ' - Time to change turns!  <<<<<<<<<<\n');

  		// Update time of next turn change
  		nextTurnChangeTimestamp = Date.now() + turnDuration;

		changeTurn(socketId);

		// Broadcast turnChange with data to ALL clients
		io.emit( 'turnChange', getTurnData() );

		//console.log( getTurnData() );
	}, turnDuration); // TO DO: enable user-specified turn length

	return timerId;
}