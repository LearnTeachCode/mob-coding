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



// When client connects to server,
socket.on('connect', function(){	
	// Generate default name to match socket.id
	myNameInputView.value = 'Anonymous-' + socket.id.slice(0,4);
	// Update ID of first <li> in playerListView for player name highlighting with togglePlayerHighlight()
	myNameListItemView.id = socket.id;
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
	console.log(event);
	console.log('%c ' + editorInputView.value, 'color: green; font-weight: bold;');
	
	// If user is the current player, they can broadcast
	if (socket.id === currentPlayerId) {
		console.log('Sending data to server!')
		// Send data to server
		socket.emit('editorChange', editorInputView.value);
	}
}

// Function that prevents user from typing when it's not their turn
function preventUserTyping (event) {
	event.preventDefault();
	//return false;
};

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
	var playerArray = playerIdArray.map(function(id){
		return {id: id, name: playerData[id]};
	});
	console.log('playerArray:');
	console.log(playerArray);

	// Get names of current and next players based on saved local IDs
	var currentPlayerName = playerData[currentPlayerId];
	var nextPlayerName = playerData[nextPlayerId];

	// Update the UI
	updatePlayerListView(playerArray);
	updateCurrentTurnView(currentPlayerName);
	updateNextTurnView(nextPlayerName);
}

// When receiving new myNameInputView data from server
function handleTurnChange (turnData) {
	console.log('%c turnChange event received!', 'color: blue; font-weight: bold;');
	console.dir(turnData);	

	// Remove highlight from previous current player's name in playerListView
	togglePlayerHighlight(false);

	// Update local state
	currentPlayerId = turnData.current.id;
	nextPlayerId = turnData.next.id;

	console.log('Updated local state. Current ID: ' + currentPlayerId + ', next ID: ' + nextPlayerId);

	// Add highlight to the new current player's name in playerListView
	togglePlayerHighlight(true);

	// If user is no longer the current player, prevent them from typing/broadcasting!
	if (socket.id !== currentPlayerId) {
		console.log("User's turn is over. Setting event listeners accordingly.");
		editorInputView.removeEventListener('input', handleUserTyping);
		editorInputView.addEventListener('keydown', preventUserTyping);
	// Otherwise if user's turn is now starting, enable typing/broadcasting!
	} else {
		console.log("User's turn is starting! Setting event listeners accordingly.");
		editorInputView.removeEventListener('keydown', preventUserTyping);
		editorInputView.addEventListener('input', handleUserTyping);		
	}

	// Update UI
	updateTimeLeftView(turnData.millisRemaining);
	updateCurrentTurnView(turnData.current.name);
	updateNextTurnView(turnData.next.name);	
	toggleMyTurnHighlight();
}

/* -------------------------------------------------
	FUNCTIONS TO UPDATE VIEWS	
---------------------------------------------------- */

// UI highlights to notify user when it's their turn
function toggleMyTurnHighlight () {	

	// If user is the next player, highlight text box
	if (socket.id === currentPlayerId) {
		document.body.classList.add('myturn');
	} else {
		document.body.classList.remove('myturn');
	}

}

// Highlight name of current player in playerListView
function togglePlayerHighlight (toggleOn) {
	// First check if element exists, for case where user is the only player
	if (document.getElementById(currentPlayerId)) {
		// Add highlight
		if (toggleOn) {
			document.getElementById(currentPlayerId).classList.add('highlight');
		// Remove highlight
		} else {
			document.getElementById(currentPlayerId).classList.remove('highlight');
		}	
	}
}

// Using data from server, update list of players
function updatePlayerListView (playerArray) {	
	// Delete the contents of playerListView each time
	while (playerListView.firstChild) {
    	playerListView.removeChild(playerListView.firstChild);
	}

	// Put li#me back into playerListView! (using previously saved reference)
	playerListView.appendChild(myNameListItemView);

	// Append player names to playerListView
	playerArray.forEach(function(player){
		
		// Create an <li> node with player's name
		var playerElement = document.createElement('li');
		playerElement.id = player.id;
		playerElement.textContent = player.name;

		// If this player is the current player, highlight their name
		if (player.id === currentPlayerId) {
			playerElement.classList.add('highlight');
		}

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

	console.log('updateTimeLeftView CALLED with: ' + timerDurationMillis);

	var turnEndTimestamp = Date.now() + timerDurationMillis;

	// Animate countdown timer
	function step(timestamp) {
		var millisRemaining = turnEndTimestamp - Date.now();

		console.log('millisRemaining: ' + millisRemaining);

		var secondsRemaining = Math.floor(millisRemaining / 1000);
		var minutes = Math.floor(secondsRemaining / 60);
		var seconds = secondsRemaining % 60;

		// Format mm:ss string, padded with zeroes if needed
		timeLeftView.textContent = ((minutes.toString().length > 1) ? minutes.toString() : '0' + minutes.toString()) + ':' + ((seconds.toString().length > 1) ? seconds.toString() : '0' + seconds.toString());

		if (millisRemaining > 100) {
			animationId = window.requestAnimationFrame(step);
		}
	}
	animationId = window.requestAnimationFrame(step);
}

// Update currentTurnView with current player's name
function updateCurrentTurnView (playerName) {
	console.log('Called updateCurrentTurnView with: ' + playerName);
	currentTurnView.textContent = playerName;

	// If user is the current player, highlight their name
	if (socket.id === currentPlayerId) {
		currentTurnView.classList.add('highlightme');
		currentTurnView.textContent = "It's your turn!";
	} else {
		currentTurnView.classList.remove('highlightme');
	}
}

// Update nextTurnView with next player's name
function updateNextTurnView (playerName) {
	console.log('Called updateNextTurnView with: ' + playerName);
	nextTurnView.textContent = playerName;

	// If user is the next player, highlight their name
	if (socket.id === nextPlayerId) {
		nextTurnView.classList.add('highlightme');
		nextTurnView.textContent = "You're up next!";
	} else {
		nextTurnView.classList.remove('highlightme');
	}
}