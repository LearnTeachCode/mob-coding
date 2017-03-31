// Start a WebSocket connection with the server using SocketIO
var socket = io();
	// Note that the SocketIO client-side library and this file (local.js)
	// were both imported in index.html right before the </body> tag


// SAVING LOCAL STATE -- GLOBAL VARS (ugh) 
var currentPlayerId;
var nextPlayerId;
var animationId;

/* -------------------------------------------------
	LIST OF IDs, DYNAMIC ELEMENTS:
    - editor       	 	<textarea> collab code editor
    - timeleft      	<p> shows minutes:seconds
    - currentturn   	name of current player
    - nextturn     		name of next player
    - playerlist   		<ol> list of player names
    - myname       		<input> user's name
---------------------------------------------------- */
var editorInputView = document.getElementById('editor');
var timeLeftView = document.getElementById('timeleft');
var currentTurnView = document.getElementById('currentturn');
var nextTurnView = document.getElementById('nextturn');
var playerListView = document.getElementById('playerlist');
var myNameInputView = document.getElementById('myname');
var myNameListItemView = document.getElementById('me');
/* ------------------------------------------------------------
	EVENT LISTENERS	/ SEND DATA TO SERVER

	// NOTE: Might need to add/remove event listeners
	// dynamically? Not sure.

	EVENT NAMES: 		CLIENT FUNCTIONS:

	- connection 		Send: 		SocketIO built-in event	

	- disconnect 		Send: 		SocketIO built-in event

	- editorChange		Send: 		handleUserTyping
						Receive: 	handleEditorChange

	- userNameChange	Send: 		handleUserNameChange

	- playerListChange 	Receive: 	handlePlayerListChange						

	- turnChange 		Receive: 	handleTurnChange
-------------------------------------------------------------- */
editorInputView.addEventListener('input', handleUserTyping);
myNameInputView.addEventListener('input', handleUserNameChange);


/* -------------------------------------------------
	INITIALIZE APP (ON SOCKET CONNECTION)
---------------------------------------------------- */

// When client connects to server, generate default name to match socket.id
socket.on('connect', function(){	
	myNameInputView.value = 'Anonymous-' + socket.id.slice(0,4);
});

// When client disconnects, stop the timer!
socket.on('disconnect', function(){	
	console.log('* * * * * * * *  DISCONNECTED FROM SERVER  * * * * * * * *');
	window.cancelAnimationFrame(animationId);	
	timeLeftView.textContent = '....';
});

// Send editorInputView data to server
function handleUserTyping (event) {
	console.log('handleUserTyping event! value: ');
	console.log('%c ' + editorInputView.value, 'color: green; font-weight: bold;');
	
	socket.emit('editorChange', editorInputView.value);
}

// Send user's new name to server and update UI
function handleUserNameChange (event) {
	console.log('handleUserNameChange event! value: ');
	console.log('%c ' + myNameInputView.value, 'color: green; font-weight: bold;');
	
	// Update UI if user is the current or next player
	if (currentPlayerId === socket.id) {
		updateCurrentTurnView(myNameInputView.value);	
	} else if (nextPlayerId === socket.id) {
		updateNextTurnView(myNameInputView.value);	
	}

	// Send user's new name to server
	socket.emit('userNameChange', myNameInputView.value);	
}

// TODO: Test 'input' event some more in different browsers!
	// maybe add support for IE < 9 later?

/* -------------------------------------------------
	EVENT LISTENERS / RECEIVE DATA FROM SERVER	
---------------------------------------------------- */
socket.on('editorChange', handleEditorChange);
socket.on('playerListChange', handlePlayerListChange);
socket.on('turnChange', handleTurnChange);

// When receiving new editorInputView data from server
function handleEditorChange (data) {
	console.log('editorChange event received!');
	console.log('%c ' + data, 'color: blue; font-weight: bold;');

	updateEditorView(data);
}

// When receiving new player list data from server
function handlePlayerListChange (playerData) {
	console.log('%c playerListChange event received!', 'color: blue; font-weight: bold;');
	console.dir(playerData);

	// Transform the data!!

	// Transform into an array to more easily reorder it
	var playerIdArray = Object.keys(playerData);

	var userIndex = playerIdArray.indexOf(socket.id);
	var playerListTopSegment = playerIdArray.slice(userIndex+1);
	var playerListBottomSegment = playerIdArray.slice(0, userIndex);

	// Merge the two arrays, reording so current user is at the top
	// (but removed from this list), without modifying the turn order
	playerIdArray = playerListTopSegment.concat(playerListBottomSegment);

	// Generate an array of just usernames for updating the UI
	var playerNameArray = playerIdArray.map(function(id){
		return playerData[id];
	});
	console.log('playerNameArray:');
	console.log(playerNameArray);

	// Get names of current and next players based on saved local IDs
	var currentPlayerName = playerData[currentPlayerId];
	var nextPlayerName = playerData[nextPlayerId];

	// Update the UI
	updatePlayerListView(playerNameArray);
	updateCurrentTurnView(currentPlayerName);
	updateNextTurnView(nextPlayerName);
}

// When receiving new myNameInputView data from server
function handleTurnChange (turnData) {
	console.log('%c turnChange event received!', 'color: blue; font-weight: bold;');
	console.dir(turnData);	

	// Several things will happen when the turn changes!

	// If user is current player,
	// need to prevent user from typing in the editor!

	// Update local state
	currentPlayerId = turnData.current.id;
	nextPlayerId = turnData.next.id;

	console.log('Updated local state. Current ID: ' + currentPlayerId + ', next ID: ' + nextPlayerId);

	// Update UI
	updateTimeLeftView(turnData.millisRemaining);
	updateCurrentTurnView(turnData.current.name);
	updateNextTurnView(turnData.next.name);
	
	//toggleYourTurnView();

}

/* -------------------------------------------------
	FUNCTIONS TO UPDATE VIEWS	
---------------------------------------------------- */

// Do something to notify user when it's their turn
function toggleYourTurnView () {
	// maybe just toggle a CSS class on the <body>?
	// or send a notification somehow? an alert() ?
	// or play a sound?
}

// Using data from server, update list of players
function updatePlayerListView (playerNameArray) {	
	// Delete the contents of playerListView each time
	while (playerListView.firstChild) {
    	playerListView.removeChild(playerListView.firstChild);
	}

	// Put li#me back into playerListView! (using previously saved reference)
	playerListView.appendChild(myNameListItemView);

	// Append player names to playerListView
	playerNameArray.forEach(function(playerName){
		
		// Create an <li> node with player's name
		var playerElement = document.createElement('li');
		playerElement.textContent = playerName;

		// Append to playerListView <ol>
		playerListView.appendChild(playerElement);

	});
}

// Using data from server, update text in code editor
function updateEditorView (editorData) {
	editorInputView.value = editorData;
}

// Update timeLeftView with the time remaining	
function updateTimeLeftView (timerDurationMillis) {

	console.log('updateTimeLeftView CALLED with: ' + timerDurationMillis)

	var start = null;

	// Animate countdown timer
	function step(timestamp) {
		if (!start) start = timestamp;		

		var millisElapsed = (timestamp - start);
		var millisRemaining = timerDurationMillis - millisElapsed;
		
		//console.log('millisElapsed: ' + millisElapsed);
		//console.log('********* TIMER UPDATE: ' + millisRemaining);

		var secondsRemaining = Math.floor(millisRemaining / 1000);
		var minutes = Math.floor(secondsRemaining / 60);
		var seconds = secondsRemaining % 60;

		// Format mm:ss string, padded with zeroes if needed
		timeLeftView.textContent = ((minutes.toString().length > 1) ? minutes.toString() : '0' + minutes.toString()) + ':' + ((seconds.toString().length > 1) ? seconds.toString() : '0' + seconds.toString());

		if (millisElapsed < timerDurationMillis) {
			animationId = window.requestAnimationFrame(step);
		}
	}
	animationId = window.requestAnimationFrame(step);
}

// Update currentTurnView with current player's name
function updateCurrentTurnView (playerName) {
	console.log('Called updateCurrentTurnView with: ' + playerName);
	currentTurnView.textContent = playerName;
}

// Update nextTurnView with next player's name
function updateNextTurnView (playerName) {
	console.log('Called updateNextTurnView with: ' + playerName);
	nextTurnView.textContent = playerName;
}
