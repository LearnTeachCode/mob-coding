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
	console.log('Request recieved for /github-client route. Sending response: GITHUB_CLIENT_ID');
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
	    console.log('\n*****done receiving response data:\n' + githubResponseBody + '\n');	    

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
	- loggedIn			io.emit: playerListChange
						socket.emit: editorChange, changeScroll, changeCursor, turnChange
	- disconnect 		Broadcast: playerListChange
	- editorChange		Broadcast: editorChange
	- changeCursor		Broadcast: changeCursor
	- changeScroll		Broadcast: changeScroll
	- turnChange 		Broadcast: turnChange
-------------------------------------------------------------- */

// playerData:
// { 'socket-id-here': {login: 'username-here', avatar_url: 'user-avatar-url-here'} }

var playerData = {};
var playerList = [];

var editorContent = '// Type JavaScript here!';
var editorCursorAndSelection;
var editorScroll;

var timerId;
var nextTurnChangeTimestamp;
var currentPlayerIndex;
const turnDuration = 180000;

// When a user connects over websocket,
io.on('connection', function (socket) {
	
	console.log('A user connected! (But not yet logged in.)');	
	console.log('\t\t playerList.length: ' + playerList.length);

	// When a user logs in,
	socket.on('loggedIn', function (userData) {
		console.log('* * * * # # # #  User logged in!  # # # # * * * * *');
		console.log('\t\t > > > ' + userData.login + ' < < <');
		console.log('\t\t playerList.length: ' + playerList.length);

		// Add user ID/name to playerList
		playerData[socket.id] = {};
		playerData[socket.id].login = userData.login;
		playerData[socket.id].avatar_url = userData.avatar_url;
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
		if (timerId == null) {
			timerId = startTurnTimer(timerId, turnDuration, socket.id);
		}
			
		// Broadcast current turn data to all clients (for the case where nextPlayerId changes when a second user joins)
		io.emit( 'turnChange', getTurnData() );

		// Broadcast updated playerList to ALL clients
		io.emit('playerListChange', playerData);

		console.log('----------------- initial turnData broadcasted:');
		console.log( getTurnData() );

		console.log(' ! ! !   ! ! !   player data and list   ! ! !    ! ! !');
		console.log(playerData);
		console.log(playerList);
		console.log('\t\t playerList.length: ' + playerList.length);
	});	

	// When a user disconnects,
	socket.on('disconnect', function() {
		
		console.log('A user disconnected!');	
		console.log('currentPlayerIndex: ' + currentPlayerIndex);

		// If disconnected user was logged in,
		if (playerList.indexOf(socket.id) !== -1) {
			console.log('\t User removed from list of logged-in players. ID: ' + socket.id);

			// Temporarily save ID of current player (before removing from playerList, for a later check!)
			var currentPlayerId = playerList[currentPlayerIndex];

			// Remove disconnected user from playerList
			delete playerData[socket.id];
			playerList.splice( playerList.indexOf(socket.id), 1);			

			// If no logged-in players are left, reset the game!
			if (playerList.length === 0) {
				console.log('No players left. Turning off the turn timer!');
				currentPlayerIndex = null;
				
				// Turn off the timer
				clearInterval(timerId);
				timerId = null;
				nextTurnChangeTimestamp = null;
			
			// Otherwise, if there are players left,
			} else {
			 	// If the disconnected user was the current player, restart timer and change the turn!
			 	if (socket.id === currentPlayerId) {
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

				// Broadcast updated playerList to update all other clients
				socket.broadcast.emit('playerListChange', playerData);
			}			 
			
			console.log('playerData: ');
			console.log(playerData);
			console.log('playerList: ');
			console.log(playerList);

		} else {
			console.log('\t User was not yet logged in, so no action taken.');
		}		
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
	var currentPlayerName = playerData[currentPlayerId].login;
	
	var nextPlayerIndex = (currentPlayerIndex + 1) % playerList.length;
	
	var nextPlayerId = playerList[nextPlayerIndex];
	var nextPlayerName = playerData[nextPlayerId].login;

	return {millisRemaining: nextTurnChangeTimestamp - Date.now(), current: {id: currentPlayerId, name: currentPlayerName}, next: {id: nextPlayerId, name: nextPlayerName}};
}

// Initializes the turn and turn timer, returns timerId
function startTurnTimer(timerId, turnDuration, socketId) {
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

	return timerId;
}