// Start a WebSocket connection with the server using SocketIO
var socket = io();
	// Note that the SocketIO client-side library and this file (local.js)
	// were both imported in index.html right before the </body> tag

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

// Send editorInputView data to server
function handleUserTyping (event) {
	console.log('handleUserTyping event! value: ');
	console.log('%c ' + editorInputView.value, 'color: green; font-weight: bold;');
	
	socket.emit('editorChange', editorInputView.value);
}

// Send myNameInputView data to server
function handleUserNameChange (event) {
	console.log('handleUserNameChange event! value: ');
	console.log('%c ' + myNameInputView.value, 'color: green; font-weight: bold;');
	
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
function handlePlayerListChange (data) {
	console.log('%c playerListChange event received!', 'color: blue; font-weight: bold;');
	console.dir(data);

	updatePlayerListView(data);
}

// When receiving new myNameInputView data from server
function handleTurnChange (data) {
	console.log('%c turnChange event received!', 'color: blue; font-weight: bold;');
	console.dir(data);

	// Several things will happen when the turn changes!

	// If user is current player,
	// need to prevent user from typing in the editor!

	// Update UI:
	updateCurrentTurnView(data);
	updateNextCurrentTurnView(data);
	toggleYourTurnView();
}

// MAYBE: handle clock sync events from server???


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
function updatePlayerListView (playerListData) {

}

// Using data from server, update text in code editor
function updateEditorView (editorData) {
	editorInputView.value = editorData;
}

// Update timeLeftView with the time remaining
	// TODO: use requestAnimationFrame probably!!
function updateTimeLeftView (timeRemaining) {
	
}

// Update currentTurnView with current player's name
function updateCurrentTurnView (playerName) {

}

// Update nextTurnView with next player's name
function updateNextCurrentTurnView (playerName) {

}


