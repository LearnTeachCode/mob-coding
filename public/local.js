// Start a WebSocket connection with the server using SocketIO
const socket = io();

/* ------------------------------------------------------------
	GAME STATE:

{
  nextTurnTimestamp,
  turnIndex,
  currentGist: {id, url, owner},
  players:
    [
      {id, login,avatar_url}, { ... }, { ... }, ...
    ]
}

-------------------------------------------------------------- */

let gameState = {
	nextTurnTimestamp: null,
	turnIndex: 0,
	currentGist: null,
	players: []
};

// SAVING LOCAL STATE -- GLOBAL VARS (ugh) 
let animationId;
// Later this shouldn't be hard-coded:
const turnDuration = 60000;
// Meant to be temporary:
let currentAccessToken;

/* -------------------------------------------------
	LIST OF IDs, DYNAMIC ELEMENTS:
	- loginmodal		container for login screen
	- loginbutton		<button> to log in
    - editor       	 	<textarea> collab code editor
    - timeleft      	<p> shows minutes:seconds
    - currentturn   	name of current player
    - nextturn     		name of next player
    - playerlist   		<ol> list of player names
    - myname       		<span> user's name
    - currentgist 		<p> displays latest gist info
---------------------------------------------------- */
let loginModalView = document.getElementById('loginmodal');
let loginButtonView = document.getElementById('loginbutton');
let editorInputView = document.getElementById('editor');
let timeLeftView = document.getElementById('timeleft');
let currentTurnView = document.getElementById('currentturn');
let nextTurnView = document.getElementById('nextturn');
let playerListView = document.getElementById('playerlist');
let currentGistView = document.getElementById('currentgist');
/* -------------------------------------------------
	GITHUB AUTHENTICATION	
---------------------------------------------------- */

// If GitHub tempcode is available as a parameter, get access_token from server and log in!
if ( window.location.href.match(/\?code=(.*)/) ) {
	// Code for matching URL param from https://github.com/prose/gatekeeper
	let tempCode = window.location.href.match(/\?code=(.*)/)[1];

	// Remove parameter from URL, updating this entry in the client's browser history
	history.replaceState(null, '', '/');
	
	// Authenticate and log in with GitHub
	loginUser(tempCode);

// Otherwise, if user has not yet started the login process,
} else {
	// Get the client ID environment variable from the server
	updateLoginButtonView();
}

/* -------------------------------------------------
	ACE EDITOR SETUP
	https://ace.c9.io
---------------------------------------------------- */
let editor = ace.edit('editor');
let Range = ace.require('ace/range').Range;
editor.setTheme("ace/theme/monokai");
editor.getSession().setMode('ace/mode/javascript');
editor.setReadOnly(true);

/* ---------------------------------------------------------------------------------------------------------------------------------------------------
	EVENTS:

Event Name 			Sent By 	Sent To 			Data 						Client Functions: 				Description
------------------	----------	------------------	--------------------------	----------------------------- 	---------------------------------------------
playerJoined 		Client 		Server 				{login, avatar_url} 		loginUser						When new player completes login process
playerJoined 		Server 		All other clients 	{id, login, avatar_url} 	handlePlayerJoined				Update other clients with new player data
gameState 			Server 		One client 			See game state model! 		handleGameState					Initialize game state for new player that just logged in,
																													and trigger new gist creation if game is just starting!
playerLeft 			Server 		All other clients 	id 															Update other clients to remove disconnected player
turnChange 			Server 		All clients 		onDisconnect (Boolean)		handleTurnChange				Trigger clients to change the turn
newGist 			Client 		Server 				{id, url, owner} 			handleNewGist					Broadcast new Gist data
editorTextChange	Client 		Server 				"just a string!" 			handleLocalEditorTextChange		Broadcast changes to code editor content
editorScrollChange 	Client 		Server 				{scrollLeft, scrollTop} 	handleLocalEditorScrollChange	Broadcast changes to code editor content
editorCursorChange 	Client 		Server 				{ 							handleLocalEditorCursorChange	Broadcast cursor moves or selection changes
														cursor: {column, row},
														range: {
															end: {column, row},
															start: {column, row}
														}
													}	
disconnect 			Client 		Server 				... 						...								When clients disconnect from server (SocketIO function)
connection 			Client 		Server 				... 						... 							When clients connect to server (SocketIO function)

---------------------------------------------------------------------------------------------------------------------------------------------------- */

/* ------------------------------------------------------------
	LOCAL EVENT LISTENERS
-------------------------------------------------------------- */	
editor.getSession().on('change', handleLocalEditorTextChange);
editor.getSession().selection.on('changeCursor', handleLocalEditorCursorChange);
editor.getSession().on('changeScrollLeft', handleLocalEditorScrollChange);
editor.getSession().on('changeScrollTop', handleLocalEditorScrollChange);

/* -------------------------------------------------
	SERVER EVENT LISTENERS
---------------------------------------------------- */
socket.on('editorTextChange', handleServerEditorTextChange);
socket.on('editorCursorChange', handleServerEditorCursorChange);
socket.on('editorScrollChange', handleServerEditorScrollChange);
socket.on('gameState', handleGameState);
socket.on('playerJoined', handlePlayerJoined);
socket.on('playerLeft', handlePlayerLeft);
socket.on('turnChange', handleTurnChange);
socket.on('newGist', handleNewGist);

// When client disconnects, stop the timer!
socket.on('disconnect', function(){	
	console.log('* * * * * * * *  DISCONNECTED FROM SERVER  * * * * * * * *');
	window.cancelAnimationFrame(animationId);	
	timeLeftView.textContent = '....';
});

// Authenticate and log in with GitHub
async function loginUser (tempCode) {
	try {
		// Save local state
		currentAccessToken = await get('/github-auth?code=' + tempCode);
		
		// Send tempCode to server in exchange for GitHub access token
		let userData = await getJSON('https://api.github.com/user?access_token=' + currentAccessToken);

		console.log('**************** Logged in! GitHub User Data: *********************');
		console.log(userData);
		// TODO: show loading animation while waiting???
		
		// Update views with user's GitHub name and avatar
		updateLoggedInView(userData.login, userData.avatar_url);

		// Notify server that user logged in
		socket.emit('playerJoined', {login: userData.login, avatar_url: userData.avatar_url});

	} catch (err) {
		handleError(err);
	}
}

// Send editorInputView data to server
function handleLocalEditorTextChange (event) {
	// If user is the current player, they can broadcast
	if (socket.id === getCurrentPlayer().id ) {
		// Send data to server
		socket.emit( 'editorTextChange', editor.getValue() );
	}
}

// Send cursor and selection data to server
function handleLocalEditorCursorChange (event) {
	// Cursor object:
	// 		{column, row}
	// Selection Range object:
	// 		{ end: {column, row}, start: {column, row} }

	// Send to server:
	socket.emit( 'editorCursorChange', { cursor: editor.getSession().selection.getCursor(), range: editor.getSession().selection.getRange() } );
}

// Send scroll data to server
function handleLocalEditorScrollChange (event) {
	// Send to server:
	socket.emit('editorScrollChange', { scrollLeft: editor.getSession().getScrollLeft(), scrollTop: editor.getSession().getScrollTop() });	
}

// TODO: Test 'input' event some more in different browsers!
	// maybe add support for IE < 9 later?

// When receiving new editorInputView data from server
function handleServerEditorTextChange (data) {
	updateEditorView(data);
}

// When receiving new cursor/selection data from server
function handleServerEditorCursorChange (data) {
	// Set Ace editor's cursor and selection range to match
	let updatedRange = new Range(data.range.start.row, data.range.start.column, data.range.end.row, data.range.end.column);
	editor.getSession().selection.setSelectionRange( updatedRange );
}

// When receiving new scroll data from server
function handleServerEditorScrollChange (data) {
	// Set Ace editor's scroll position to match
	editor.getSession().setScrollLeft(data.scrollLeft);
	editor.getSession().setScrollTop(data.scrollTop);
}

// Initialize client after logging in, using game state data from server
function handleGameState (serverGameState) {
	gameState.nextTurnTimestamp = serverGameState.nextTurnTimestamp;
	gameState.turnIndex = serverGameState.turnIndex;
	gameState.currentGist = serverGameState.currentGist;
	gameState.players = serverGameState.players;

	console.log("handleGameState called");
	console.dir(gameState);
	
	// Update editor content
	updateEditorView(serverGameState.editor.content);

	// Update editor cursor and selection range
	if (serverGameState.editor.cursorAndSelection !== null)  {
		let updatedRange = new Range(serverGameState.editor.cursorAndSelection.range.start.row, serverGameState.editor.cursorAndSelection.range.start.column, serverGameState.editor.cursorAndSelection.range.end.row, serverGameState.editor.cursorAndSelection.range.end.column);
		editor.getSession().selection.setSelectionRange( updatedRange );
	}
	
	// Update editor scroll position
	if (serverGameState.editor.scroll !== null)  {
		editor.getSession().setScrollLeft(serverGameState.editor.scroll.scrollLeft);
		editor.getSession().setScrollTop(serverGameState.editor.scroll.scrollTop);
	}

	// If no Gist exists, create it!
	if (gameState.currentGist == null)  {
		createNewGist();
	} else { // Otherwise, if a Gist does exist, display it!		
		updateCurrentGistView(gameState.currentGist);
	}

	// Update UI
	updatePlayerListView(gameState.players);
	updateTimeLeftView(gameState.nextTurnTimestamp);
	updateCurrentTurnView(getCurrentPlayer().login);
	updateNextTurnView(getNextPlayer().login);
	toggleMyTurnHighlight();

	// If this client is the current player, let them type!
	if ( socket.id === getCurrentPlayer().id ) {
		editor.setReadOnly(false);
	}
}

// When a new player joins, update using data from server
function handlePlayerJoined (newPlayerData) {
	// Add new player
	gameState.players.push(newPlayerData);

	// Update the UI
	updatePlayerListView(gameState.players);
	updateCurrentTurnView(getCurrentPlayer().login);
	updateNextTurnView(getNextPlayer().login);
}

// When a player disconnects, update using data from server
function handlePlayerLeft (playerId) {	

	// Update turnIndex only if disconnected player comes BEFORE current player in the players array
	if ( getPlayerIndexById(playerId, gameState.players) < gameState.turnIndex ) {
		gameState.turnIndex--;
	}

	// Remove disconnected player from player list
	removePlayer(playerId, gameState.players);

	// Remove view for disconnected player from the player list view
	playerListView.removeChild( document.getElementById(playerId) );
}

// When receiving turnChange event from server
function handleTurnChange (onDisconnect) {
	console.log('%c turnChange event received! TIME: ' + new Date().toString().substring(16,25), 'color: blue; font-weight: bold;');

	// Update the timestamp of the next turn, reset the clock!
	gameState.nextTurnTimestamp = Date.now() + turnDuration;

	// If turn change was NOT triggered by current player disconnecting, and a Gist exists,
	if (!onDisconnect && gameState.currentGist != null) {
		
		// Temporarily save previous player info before changing turn
		let previousPlayer = getCurrentPlayer();
		console.log("previousPlayer login: " + previousPlayer.login);

		// And if this client is the one whose turn is ending, then fork and/or edit the Gist before passing control to next player!
		if (socket.id === previousPlayer.id) {
			console.log("This user's turn is about to end.");			
			forkAndEditGist(previousPlayer.login, gameState.currentGist.id, editor.getValue());
		}
	}

	changeTurn();
		
	console.log("TURN CHANGED! turnIndex: " + gameState.turnIndex + ", # players: " + gameState.players.length, ", current player: " + getCurrentPlayer().id + " - " + getCurrentPlayer().login);

	// If user is no longer the current player, prevent them from typing/broadcasting!
	if ( socket.id !== getCurrentPlayer().id ) {		
		editor.setReadOnly(true);
	// Otherwise if user's turn is now starting,
	} else {
		console.log("User's turn is starting. Allow typing!");
		// let the user type/broadcast again
		editor.setReadOnly(false);
	}

	// Update UI
	togglePlayerHighlight(getCurrentPlayer().id);
	updateTimeLeftView(gameState.nextTurnTimestamp);
	updateCurrentTurnView(getCurrentPlayer().login);
	updateNextTurnView(getNextPlayer().login);
	toggleMyTurnHighlight();
}

// When receiving "newGist" event from server,
function handleNewGist (gistData) {
	console.log("called handleNewGist at " + new Date().toString().substring(16,25), 'color: green; font-weight: bold;');
	console.log(gistData);

	// Update local state
	gameState.currentGist = gistData;

	// Update views
	updateCurrentGistView(gistData);
}

/* -------------------------------------------------
	FUNCTIONS TO UPDATE VIEWS	
---------------------------------------------------- */

// Get the client ID environment variable from the server
async function updateLoginButtonView() {
	
	// TODO: Handle this with server-side rendering later!

	try {
		let clientId = await get('/github-client');

		console.log('>>>>>>>>>>>>>> Received response from /github-client route!:');
		console.log(clientId);

		// Render loginLinkView with the GitHub auth request URL
			// TODO: review GitHub SCOPES when I try adding more features		
		document.getElementById('loginlink').setAttribute('href', 'https://github.com/login/oauth/authorize?client_id=' + clientId + '&scope=gist');
		document.getElementById('loginlink').style.display = 'block';
		
		// Hide "loading" placeholder
		document.getElementById('loginloading').style.display = 'none';
	} catch (err) {
		handleError(err);
	}
}

// Update views for logged in user
function updateLoggedInView (userName, userAvatar) {	
	// Hide loginModalView	
	loginModalView.style.opacity = '0';
	
	window.setTimeout(function(){
		loginModalView.style.display = 'none';
	}, 900);
}

// UI highlights to notify user when it's their turn
function toggleMyTurnHighlight () {	

	// If user is the next player, highlight text box
	if ( socket.id === getCurrentPlayer().id ) {
		document.body.classList.add('myturn');
	} else {
		document.body.classList.remove('myturn');
	}

}

// Highlight name of specified player in playerListView
function togglePlayerHighlight (playerId) {	
	let highlightedPlayerElement = document.querySelector('.highlight');
	let nextPlayerElement = document.getElementById(playerId);
	
	// Remove highlight from the currently-highlighted element if it exists:
	if (highlightedPlayerElement) {
		highlightedPlayerElement.classList.remove('highlight');
	}

	// Add highlight to specified player element (if element exists)	
	if (nextPlayerElement) {		
		nextPlayerElement.classList.add('highlight');
	}
}

// Update list of players
function updatePlayerListView (playerArray) {

	// First reorder the player array so current user is at the top, without modifying the turn order
	let clientIndex = getPlayerIndexById(socket.id, playerArray);
	let playersTopSegment = playerArray.slice(clientIndex);
	let playersBottomSegment = playerArray.slice(0, clientIndex);
	let reorderedPlayers = playersTopSegment.concat(playersBottomSegment);

	// Delete the contents of playerListView each time
	while (playerListView.firstChild) {
    	playerListView.removeChild(playerListView.firstChild);
	}

	// Append player names to playerListView
	reorderedPlayers.forEach(function(player){		
		// Create an <li> node with player's name and avatar
		let playerElement = document.createElement('li');
		playerElement.id = player.id;		

		// Display user's GitHub avatar image
		let userAvatarElem = document.createElement('img');
	  	userAvatarElem.src = player.avatar_url;
  		userAvatarElem.classList.add('avatar');

		// If this player is the current player, highlight their name
		if (player.id === getCurrentPlayer().id) {
			playerElement.classList.add('highlight');
		}

		// Append player <li> to playerListView <ol>
		playerListView.appendChild(playerElement);

		// Append image and text node to player <li>
  		playerElement.appendChild(userAvatarElem);
  		playerElement.appendChild(document.createTextNode(player.login));
	});
}

// Using data from server, update text in code editor
function updateEditorView (editorData) {
	editor.setValue(editorData);
	editor.selection.clearSelection();
}

// Update timeLeftView to display the time remaining in mm:ss format
function updateTimeLeftView (nextTurnTimestamp) {

	// Animate countdown timer
	function step(timestamp) {
		let millisRemaining = nextTurnTimestamp - Date.now();

		let secondsRemaining = Math.floor(millisRemaining / 1000);
		let minutes = Math.floor(secondsRemaining / 60);
		let seconds = secondsRemaining % 60;

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
	//console.log('Called updateCurrentTurnView with: ' + playerName);
	currentTurnView.textContent = playerName;

	// If user is the current player, highlight their name
	if (socket.id === getCurrentPlayer().id) {
		currentTurnView.classList.add('highlightme');
		currentTurnView.textContent = "It's your turn!";
	} else {
		currentTurnView.classList.remove('highlightme');
	}
}

// Update nextTurnView with next player's name
function updateNextTurnView (playerName) {
	//console.log('Called updateNextTurnView with: ' + playerName);
	nextTurnView.textContent = playerName;

	// If user is the next player, highlight their name
	if (socket.id === getNextPlayer().id) {
		nextTurnView.classList.add('highlightme');
		nextTurnView.textContent = "You're up next!";
	} else {
		nextTurnView.classList.remove('highlightme');
	}
}

// Append to a list of gist links for this game
function updateCurrentGistView (gistData) {
	currentGistView.innerHTML = '<strong>Latest code:</strong> <a href="' + gistData.url + '">' + gistData.url + '</a>';	
}

/* -------------------------------------------------
	GITHUB API FUNCTIONS
---------------------------------------------------- */
// Make a POST request via AJAX to create a Gist for the current user
async function createNewGist() {
	console.log('called createNewGist at ' + new Date().toString().substring(16,25), 'color: red; font-weight: bold;');
	// use currentAccessToken	
	// use https://developer.github.com/v3/gists/#create-a-gist

	let gistObject = {
	  "description": "A saved mob programming session with Learn Teach Code!",
	  "public": true,
	  "files": {
	    "mob-coding-challenge.js": {
	      "content": editor.getValue() + '\n'
	    }
	  }
	};

	try {
		let gistData = JSON.parse( await postWithGitHubToken('https://api.github.com/gists', gistObject) );
	
		// Save new Gist data locally and update UI
		handleNewGist({id: gistData.id, url: gistData.html_url, owner: gistData.owner.login});

		// Send gist data to server
		socket.emit('newGist', gameState.currentGist);	
	} catch (err) {
		handleError(err);
	}
}

async function forkAndEditGist(previousPlayerLogin, gistId, codeEditorContent) {
	console.log('called forkAndEditGist at ' + new Date().toString().substring(16,25), 'color: orange; font-weight: bold;');

	let gistObject = {"test": ""}; // TODO: see if I can just use an empty object or null

	if (previousPlayerLogin !== gameState.currentGist.owner) {
		try {
			let gistData = await postWithGitHubToken('https://api.github.com/gists/' + gistId + '/forks', gistObject).then(JSON.parse);

			console.log('forkGist: response received at ' + new Date().toString().substring(16,25), 'color: red; font-weight: bold;');
			console.dir(gistData);

			// Save new Gist data locally and update UI
			handleNewGist({id: gistData.id, url: gistData.html_url, owner: gistData.owner.login});
			
			// Send new Gist data to server
			socket.emit('newGist', gameState.currentGist);

		} catch (err) {
			handleError(err);
		}
	}

	gistObject = {
	  "description": "A saved mob programming session with Learn Teach Code!",
	  "public": true,
	  "files": {
	    "mob-coding-challenge.js": {
	      "content": codeEditorContent + '\n'
	    }
	  }
	};

	try {
		await postWithGitHubToken('https://api.github.com/gists/' + gameState.currentGist.id, gistObject);
		console.log('editGist: response received at ' + new Date().toString().substring(16,25), 'color: red; font-weight: bold;');
	} catch (err) {
		handleError(err);
	}
	
}

/* -------------------------------------------------
	HELPER FUNCTIONS
---------------------------------------------------- */

// Returns a promise, as a simple wrapper around XMLHTTPRequest
// via http://eloquentjavascript.net/17_http.html
function get(url) {
  return new Promise(function(succeed, fail) {
    let req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.addEventListener("load", function() {
      if (req.status < 400)
        succeed(req.responseText);
      else
        fail(new Error("Request failed: " + req.statusText));
    });
    req.addEventListener("error", function() {
      fail(new Error("Network error"));
    });
    req.send(null);
  });
}

// Returns a promise for a POST request, similar to get() above
function postWithGitHubToken(url, postDataObject) {
  return new Promise(function(succeed, fail) {
    let req = new XMLHttpRequest();

    req.open("POST", url, true);
    
    // Set header for POST, like sending form data
    req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    // Set header for GitHub auth
    req.setRequestHeader('Authorization', 'token ' + currentAccessToken);

    req.addEventListener("load", function() {
      if (req.status < 400)
        succeed(req.responseText);
      else
        fail(new Error("Request failed: " + req.statusText));
    });
    req.addEventListener("error", function() {
      fail(new Error("Network error"));
    });
    req.send(JSON.stringify(postDataObject));
  });
}

// Return object from parsed JSON data from a given URL
// via http://eloquentjavascript.net/17_http.html
function getJSON(url) {
  return get(url).then(JSON.parse).catch(handleError);
}

// Lazy error handling for now
function handleError(error) {
  console.log("Error: " + error);
};

function changeTurn() {
	gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
}

function getCurrentPlayer() {
	return gameState.players[gameState.turnIndex];
}

function getNextPlayer() {
	let nextPlayerIndex = (gameState.turnIndex + 1) % gameState.players.length;
	return gameState.players[nextPlayerIndex];
}

function getPlayerById(id, playerList){
	for (let i = 0; i < playerList.length; i++) {
		if (playerList[i].id === id) {
			return playerList[i];
		}
	}
	return -1;
}

function getPlayerIndexById(id, playerList) {
	for (let i = 0; i < playerList.length; i++) {
		if (playerList[i].id === id) {
			return i;
		}
	}
	return -1;
}

function removePlayer(id, playerList) {
	for (let i = 0; i < playerList.length; i++) {
		if (playerList[i].id === id) {
			playerList.splice(i, 1);
		}
	}
}