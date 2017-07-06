// Start a WebSocket connection with the server using SocketIO
var socket = io();

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
	players: []
};

// SAVING LOCAL STATE -- GLOBAL VARS (ugh) 
var animationId;
// Meant to be temporary:
var currentAccessToken;

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
var loginModalView = document.getElementById('loginmodal');
var loginButtonView = document.getElementById('loginbutton');
var editorInputView = document.getElementById('editor');
var timeLeftView = document.getElementById('timeleft');
var currentTurnView = document.getElementById('currentturn');
var nextTurnView = document.getElementById('nextturn');
var playerListView = document.getElementById('playerlist');
var currentGistView = document.getElementById('currentgist');
/* -------------------------------------------------
	GITHUB AUTHENTICATION	
---------------------------------------------------- */

// If GitHub access_token is available as a parameter, log in!
	// TODO: pass the token as a header instead? can client access it that way?
if (getAllUrlParams().access_token) {
	console.log('*********** AUTHENTICATED!!! **********');
	console.log('access_token from URL params: ' + getAllUrlParams().access_token);
	
	// TODO: show loading animation while waiting???

	// TODO: refactor getAllUrlParams(), don't need it, just need ONE param!
	
	// For now, save the access token as a global variable (I'm sure this is SUPER wrong though!)
	currentAccessToken = getAllUrlParams().access_token;

	getJSON('https://api.github.com/user?access_token=' + currentAccessToken)
	.then(loginUser).catch(handleError);

// Otherwise, if user has not yet started the login process,
} else {
	// Get the client ID environment variable from the server
	get('/github-client')
	.then(function(clientId){
		console.log('>>>>>>>>>>>>>> Received response from /github-client route!:');
		console.log(clientId);

		// Render loginLinkView with the GitHub auth request URL
			// TODO: review GitHub SCOPES when I try adding more features
		document.getElementById('loginlink').setAttribute('href', 'https://github.com/login/oauth/authorize?client_id=' + clientId + '&scope=gist');
		document.getElementById('loginlink').style.display = 'block';
		
		// Hide "...loading..." placeholder
		document.getElementById('loginloading').style.display = 'none';		
	}, handleError).catch(handleError);
}

/* -------------------------------------------------
	ACE EDITOR SETUP
	https://ace.c9.io
---------------------------------------------------- */
var editor = ace.edit('editor');
var Range = ace.require('ace/range').Range;
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
turnChange 			Server 		All clients 		null ??? 					handleTurnChange				Triggerclients to change the turn
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

// Log in with authenticated user's GitHub data
function loginUser (userData) {
	console.log('**************** Logged in! GitHub User Data: *********************');
	console.log(userData);

	// Update views with user's GitHub name and avatar
	updateLoggedInView(userData.login, userData.avatar_url);

	// Notify server that user logged in
	socket.emit('playerJoined', {login: userData.login, avatar_url: userData.avatar_url});
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
	var updatedRange = new Range(data.range.start.row, data.range.start.column, data.range.end.row, data.range.end.column);
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
		var updatedRange = new Range(serverGameState.editor.cursorAndSelection.range.start.row, serverGameState.editor.cursorAndSelection.range.start.column, serverGameState.editor.cursorAndSelection.range.end.row, serverGameState.editor.cursorAndSelection.range.end.column);
		editor.getSession().selection.setSelectionRange( updatedRange );
	}
	
	// Update editor scroll position
	if (serverGameState.editor.scroll !== null)  {
		editor.getSession().setScrollLeft(serverGameState.editor.scroll.scrollLeft);
		editor.getSession().setScrollTop(serverGameState.editor.scroll.scrollTop);
	}

	// If no Gist exists, create it!
	if (gameState.currentGist !== null)  {
		handleCreateNewGist();
	}

	// Update UI
	updatePlayerListView(gameState.players);
	updateTimeLeftView(gameState.nextTurnTimestamp);
	updateCurrentTurnView(getCurrentPlayer().login);
	updateNextTurnView(getNextPlayer().login);
	toggleMyTurnHighlight();

	// If user is the current player, let them type!
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
	// Remove disconnected player from player list
	removePlayer(playerId, gameState.players);

	// Remove view for disconnected player from the player list view
	playerListView.removeChild( document.getElementById(playerId) );
}

// When receiving turnChange event from server
function handleTurnChange () {
	console.log('%c turnChange event received! TIME: ' + new Date().toString().substring(16,25), 'color: blue; font-weight: bold;');

	// Update the timestamp of the next turn, reset the clock!
	gameState.nextTurnTimestamp = Date.now() + turnDuration;

	// Remove highlight from previous player's name in playerListView
	togglePlayerHighlight(false);

	// Temporarily save the previous player for later comparison
	var previousPlayer = getCurrentPlayer();
	
	changeTurn();

	// If this client's turn is ending and a Gist exists, fork and/or edit the gist before passing control to next player!	
	if (socket.id === previousPlayer.id && gameState.currentGist != null) {
		console.log("This user's turn is about to end.");

		// If this client (the previous player) does NOT own the current Gist,
		if (previousPlayer.login !== gameState.currentGist.owner) {
			
			console.log("handleTurnChange: now forking and editing gist " + gameState.currentGist.id);

			// Fork/edit current Gist on behalf of this client (the previous player, whose turn is ending), and send new ID to server
			forkAndEditGist(gameState.currentGist.id, editor.getValue());
		
		// Otherwise, just edit the current Gist
		} else {
		
			console.log("handleTurnChange: now editing gist " + gameState.currentGist.id);	
			editGist(gameState.currentGist.id, editor.getValue());

		}
	}
	
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
	togglePlayerHighlight(true);
	updateTimeLeftView(gameState.nextTurnTimestamp);
	updateCurrentTurnView(getCurrentPlayer().login);
	updateNextTurnView(getNextPlayer().login);
	toggleMyTurnHighlight();
}

// When receiving "newGist" event from server,
function handleNewGist (gistData) {
	// Update local state
	console.log("called handleNewGist at " + new Date().toString().substring(16,25), 'color: green; font-weight: bold;');
	console.log(gistData);
	// Update views
	updateCurrentGistView(gistData);
}

/* -------------------------------------------------
	FUNCTIONS TO UPDATE VIEWS	
---------------------------------------------------- */

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

// Highlight name of current player in playerListView
function togglePlayerHighlight (toggleOn) {
	// First check if element exists, for case where user is the only player
	if ( document.getElementById(getCurrentPlayer().id) ) {
		// Add highlight
		if (toggleOn) {
			document.getElementById( getCurrentPlayer().id ).classList.add('highlight');
		// Remove highlight
		} else {
			document.getElementById( getCurrentPlayer().id ).classList.remove('highlight');
		}	
	}
}

// Update list of players
function updatePlayerListView (playerArray) {

	// First reorder the player array so current user is at the top, without modifying the turn order
	var clientIndex = getPlayerIndexById(socket.id, playerArray);
	var playersTopSegment = playerArray.slice(clientIndex);
	var playersBottomSegment = playerArray.slice(0, clientIndex);
	var reorderedPlayers = playersTopSegment.concat(playersBottomSegment);

	// Delete the contents of playerListView each time
	while (playerListView.firstChild) {
    	playerListView.removeChild(playerListView.firstChild);
	}

	// Append player names to playerListView
	reorderedPlayers.forEach(function(player){		
		// Create an <li> node with player's name and avatar
		var playerElement = document.createElement('li');
		playerElement.id = player.id;		

		// Display user's GitHub avatar image
		var userAvatarElem = document.createElement('img');
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
		var millisRemaining = nextTurnTimestamp - Date.now();

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
function handleCreateNewGist() {
	console.log('called handleCreateNewGist at ' + new Date().toString().substring(16,25), 'color: red; font-weight: bold;');
	// use currentAccessToken	
	// use https://developer.github.com/v3/gists/#create-a-gist

	var gistObject = {
	  "description": "A saved mob programming session with Learn Teach Code!",
	  "public": true,
	  "files": {
	    "mob-coding-challenge.js": {
	      "content": editor.getValue() + '\n'
	    }
	  }
	};

	postWithGitHubToken('https://api.github.com/gists', gistObject).then(function(responseText){
		//console.log(responseText);
		console.log('handleCreateNewGist: response received at ' + new Date().toString().substring(16,25), 'color: red; font-weight: bold;');		

		var gistObject = JSON.parse(responseText);

		console.dir(gistObject);
		
		// Save new gist ID and URL locally
		currentGist = {id: gistObject.id, url: gistObject.html_url, owner: gistObject.owner.login};

		// Send new gist data to server
		socket.emit('newGist', {id: gistObject.id, url: gistObject.html_url, owner: gistObject.owner.login});

		updateCurrentGistView({id: gistObject.id, url: gistObject.html_url, owner: gistObject.owner.login});

	}, handleError);

}

// Make a POST request via AJAX to update a given Gist with the current code
function editGist(gistId, codeEditorContent) {
	console.log('called editGist at ' + new Date().toString().substring(16,25), 'color: orange; font-weight: bold;');
	// use https://developer.github.com/v3/gists/#edit-a-gist	

	var gistObject = {
	  "description": "A saved mob programming session with Learn Teach Code!",
	  "public": true,
	  "files": {
	    "mob-coding-challenge.js": {
	      "content": codeEditorContent + '\n'
	    }
	  }
	};

	postWithGitHubToken('https://api.github.com/gists/' + gistId, gistObject).then(function(responseText){
		//console.log(responseText);
		console.log('editGist: response received at ' + new Date().toString().substring(16,25), 'color: orange; font-weight: bold;');
		console.dir(JSON.parse(responseText));

	}, handleError);

}

// Make a POST request via AJAX to fork a given Gist, then commit to it with editGist()
function forkAndEditGist(gistId, codeEditorContent) {
	console.log('called forkAndEditGist at ' + new Date().toString().substring(16,25), 'color: red; font-weight: bold;');
	// use https://developer.github.com/v3/gists/#fork-a-gist

	// TODO later: see if I can refactor this function, maybe have it return a promise, so I can chain it with editGist better?

	var gistObject = {"test": ""};

	postWithGitHubToken('https://api.github.com/gists/' + gistId + '/forks', gistObject).then(function(responseText){
		//console.log(responseText);
		console.log('forkAndEditGist: response received at ' + new Date().toString().substring(16,25), 'color: red; font-weight: bold;');		

		var gistObject = JSON.parse(responseText);	
		console.dir(gistObject);

		// Send new gist data to server
		socket.emit('newGist', {id: gistObject.id, url: gistObject.html_url, owner: gistObject.owner.login});

		// Then edit the new gist:
		editGist(gistObject.id, codeEditorContent);

		updateCurrentGistView({id: gistObject.id, url: gistObject.html_url, owner: gistObject.owner.login});

	}, handleError);

}

/* -------------------------------------------------
	HELPER FUNCTIONS
---------------------------------------------------- */

// Returns a promise, as a simple wrapper around XMLHTTPRequest
// via http://eloquentjavascript.net/17_http.html
function get(url) {
  return new Promise(function(succeed, fail) {
    var req = new XMLHttpRequest();
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
    var req = new XMLHttpRequest();

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
  return get(url).then(JSON.parse, handleError);
}

// Lazy error handling for now
function handleError(error) {
  console.log("Error: " + error);
};

// Returns an object containing URL parameters
// via https://www.sitepoint.com/get-url-parameters-with-javascript/
function getAllUrlParams(url) {

  // get query string from url (optional) or window
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

  // we'll store the parameters here
  var obj = {};

  // if query string exists
  if (queryString) {

    // stuff after # is not part of query string, so get rid of it
    queryString = queryString.split('#')[0];

    // split our query string into its component parts
    var arr = queryString.split('&');

    for (var i=0; i<arr.length; i++) {
      // separate the keys and the values
      var a = arr[i].split('=');

      // in case params look like: list[]=thing1&list[]=thing2
      var paramNum = undefined;
      var paramName = a[0].replace(/\[\d*\]/, function(v) {
        paramNum = v.slice(1,-1);
        return '';
      });

      // set parameter value (use 'true' if empty)
      var paramValue = typeof(a[1])==='undefined' ? true : a[1];

      // (optional) keep case consistent
      paramName = paramName.toLowerCase();
      paramValue = paramValue.toLowerCase();

      // if parameter name already exists
      if (obj[paramName]) {
        // convert value to array (if still string)
        if (typeof obj[paramName] === 'string') {
          obj[paramName] = [obj[paramName]];
        }
        // if no array index number specified...
        if (typeof paramNum === 'undefined') {
          // put the value on the end of the array
          obj[paramName].push(paramValue);
        }
        // if array index number specified...
        else {
          // put the value at that index number
          obj[paramName][paramNum] = paramValue;
        }
      }
      // if param name doesn't exist yet, set it
      else {
        obj[paramName] = paramValue;
      }
    }
  }

  return obj;
}

function changeTurn() {
	gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
}

function getCurrentPlayer() {
	return gameState.players[gameState.turnIndex];
}

function getNextPlayer() {
	var nextPlayerIndex = (gameState.turnIndex + 1) % gameState.players.length;
	return gameState.players[nextPlayerIndex];
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