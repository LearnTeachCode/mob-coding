// Start a WebSocket connection with the server using SocketIO
var socket = io();
	// Note that the SocketIO client-side library and this file (local.js)
	// were both imported in index.html right before the </body> tag

/* -------------------------------------------------
	LIST OF IDs, DYNAMIC ELEMENTS:
    - editor       	 	<textarea> collab code editor
    - playerlist   		<ol> list of player names
    - myname       		<input> user's name
---------------------------------------------------- */
var editorInputView = document.getElementById('editor');
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
-------------------------------------------------------------- */
editorInputView.addEventListener('input', handleUserTyping);
myNameInputView.addEventListener('input', handleUserNameChange);


/* -------------------------------------------------
	INITIALIZE APP (ON SOCKET CONNECTION)
---------------------------------------------------- */
socket.on('connect', function(){
	// Update user's default name to match socket.id
	myNameInputView.value = 'Anonymous-' + socket.id.slice(0,4);
});


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

// When receiving new editorInputView data from server
function handleEditorChange (data) {
	console.log('editorChange event received!');
	console.log('%c ' + data, 'color: blue; font-weight: bold;');

	updateEditorView(data);
}

// When receiving new player list data from server
function handlePlayerListChange (playerList) {
	console.log('%c playerListChange event received!', 'color: blue; font-weight: bold;');
	console.dir(playerList);

	// Transform the data!!

	// Transform into an array to more easily reorder it
	var playerIdArray = Object.keys(playerList);

	var userIndex = playerIdArray.indexOf(socket.id);
	var playerListTopSegment = playerIdArray.slice(userIndex+1);
	var playerListBottomSegment = playerIdArray.slice(0, userIndex);

	// Merge the two arrays, reording so current user is at the top
	// (but removed from this list), without modifying the turn order
	playerIdArray = playerListTopSegment.concat(playerListBottomSegment);

	// Generate an array of just usernames for updating the UI
	var playerNameArray = playerIdArray.map(function(id){
		return playerList[id];
	});

	console.log(playerNameArray);

	// Update the UI
	updatePlayerListView(playerNameArray);
}

/* -------------------------------------------------
	FUNCTIONS TO UPDATE VIEWS	
---------------------------------------------------- */

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