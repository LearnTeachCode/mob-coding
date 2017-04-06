// Start a WebSocket connection with the server using SocketIO
var socket = io();
	// Note that the SocketIO client-side library and this file (local.js)
	// were both imported in index.html right before the </body> tag


// SAVING LOCAL STATE -- GLOBAL VARS (ugh) 
var currentPlayerId;
var nextPlayerId;
var animationId;

// If GitHub code is available as a parameter, authenticate and log in!
if (getAllUrlParams().code) {
	console.log('*********** AUTH PROCESS STARTED! **********');
	console.log('code from URL params: ' + getAllUrlParams().code);
	
	// TODO: show loading animation while waiting???

	getJSON("http://localhost:5000/767ca1fabdd2573f8b0c/" + getAllUrlParams().code)
	.then(function (authData) {
		return getJSON('https://api.github.com/user?access_token=' + authData.access_token);
	}).then(handleUserLogin).catch(handleError);
}

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
---------------------------------------------------- */
var loginModalView = document.getElementById('loginmodal');
var loginButtonView = document.getElementById('loginbutton');
var editorInputView = document.getElementById('editor');
var timeLeftView = document.getElementById('timeleft');
var currentTurnView = document.getElementById('currentturn');
var nextTurnView = document.getElementById('nextturn');
var playerListView = document.getElementById('playerlist');
var myNameView = document.getElementById('myname');
var myNameListItemView = document.getElementById('me');


/* -------------------------------------------------
	ACE EDITOR SETUP
	https://ace.c9.io
---------------------------------------------------- */
var editor = ace.edit('editor');
var Range = ace.require('ace/range').Range;
editor.setTheme("ace/theme/monokai");
editor.getSession().setMode('ace/mode/javascript');


/* ------------------------------------------------------------
	EVENT LISTENERS	/ SEND DATA TO SERVER

	EVENT NAMES: 		CLIENT FUNCTIONS:
	- connection 		Send: 		SocketIO built-in event	
	- disconnect 		Send: 		SocketIO built-in event
	- loggedIn			Send: 		handleUserLogin
	- editorChange		Send: 		handleUserTyping
						Receive: 	handleEditorChange	
	- playerListChange 	Receive: 	handlePlayerListChange						
	- turnChange 		Receive: 	handleTurnChange
	- changeCursor		Send: 		handleChangeCursor
						Receive: 	handleNewCursorData
	- changeScroll 		Send: 		handleChangeScroll
						Receive: 	handleNewScrollData
-------------------------------------------------------------- */
editor.getSession().on('change', handleUserTyping);
editor.getSession().selection.on('changeCursor', handleChangeCursor);
editor.getSession().on('changeScrollLeft', handleChangeScroll);
editor.getSession().on('changeScrollTop', handleChangeScroll);

// When client connects to server,
socket.on('connect', function(){	
	// Generate default name to match socket.id
	//myNameView.textContent = 'Anonymous-' + socket.id.slice(0,4);
	
	// Update ID of first <li> in playerListView for player name highlighting with togglePlayerHighlight()
	myNameListItemView.id = socket.id;
});

// When client disconnects, stop the timer!
socket.on('disconnect', function(){	
	console.log('* * * * * * * *  DISCONNECTED FROM SERVER  * * * * * * * *');
	window.cancelAnimationFrame(animationId);	
	timeLeftView.textContent = '....';
});

// Log in with authenticated user's GitHub data
function handleUserLogin (userData) {
	console.log('**************** Logged in! GitHub User Data: *********************');
	console.log(userData);	

	// Update views with user's GitHub name and avatar
	updateLoggedInView(userData.login, userData.avatar_url);

	// Notify server that user logged in
	socket.emit('loggedIn', {login: userData.login, avatar_url: userData.avatar_url});
}

// Send editorInputView data to server
function handleUserTyping (event) {
	console.log('handleUserTyping event! value: ');
	console.log(event);

	console.log('%c ' + editor.getValue(), 'color: green; font-weight: bold;');
	
	// If user is the current player, they can broadcast
	if (socket.id === currentPlayerId) {
		console.log('Sending data to server!')
		// Send data to server
		socket.emit( 'editorChange', editor.getValue() );
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
	console.log('%c ' + myNameView.textContent, 'color: green; font-weight: bold;');
	
	// Update UI if user is the current or next player
	if (currentPlayerId === socket.id) {
		updateCurrentTurnView(myNameView.textContent);	
	} else if (nextPlayerId === socket.id) {
		updateNextTurnView(myNameView.textContent);	
	}

	// Send user's new name to server
	socket.emit('userNameChange', myNameView.textContent);	
}

// Send cursor and selection data to server
function handleChangeCursor (event) {
	console.log('changeCursor fired!');
	console.log('%c ' + event, 'color: green; font-weight: bold;');	

	// Cursor object:
	// {column, row}

	// Selection Range object:
	// { end: {column, row}, start: {column, row} }

	// Send to server:
	socket.emit( 'changeCursor', { cursor: editor.getSession().selection.getCursor(), range: editor.getSession().selection.getRange() } );
}

// Send scroll data to server
function handleChangeScroll (event) {
	console.log('changeScroll (left or top) fired!');
	console.log('%c scrollLeft: ' + editor.getSession().getScrollLeft() + ', scrollTop: ' + editor.getSession().getScrollTop(), 'color: green; font-weight: bold;');

	// Send to server:
	socket.emit('changeScroll', { scrollLeft: editor.getSession().getScrollLeft(), scrollTop: editor.getSession().getScrollTop() });	
}

// TODO: Test 'input' event some more in different browsers!
	// maybe add support for IE < 9 later?

/* -------------------------------------------------
	EVENT LISTENERS / RECEIVE DATA FROM SERVER	
---------------------------------------------------- */
socket.on('editorChange', handleEditorChange);
socket.on('changeCursor', handleNewCursorData);
socket.on('changeScroll', handleNewScrollData);
socket.on('playerListChange', handlePlayerListChange);
socket.on('turnChange', handleTurnChange);

// When receiving new editorInputView data from server
function handleEditorChange (data) {
	console.log('editorChange event received!');
	console.log('%c ' + data, 'color: blue; font-weight: bold;');

	updateEditorView(data);
}

// When receiving new cursor/selection data from server
function handleNewCursorData (data) {
	console.log('%c cursorChange event received!', 'color: blue; font-weight: bold;');
	console.dir(data);

	// Set Ace editor's cursor and selection range to match
	var updatedRange = new Range(data.range.start.row, data.range.start.column, data.range.end.row, data.range.end.column);
	editor.getSession().selection.setSelectionRange( updatedRange );
}

// When receiving new scroll data from server
function handleNewScrollData (data) {
	console.log('%c scrollChange event received!', 'color: blue; font-weight: bold;');
	console.dir(data); 

	// Set Ace editor's scroll position to match
	editor.getSession().setScrollLeft(data.scrollLeft);
	editor.getSession().setScrollTop(data.scrollTop);
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

	// Generate an array of ids, user logins, and avatar_urls for updating the UI
	var playerArray = playerIdArray.map(function(id){
		return {id: id, login: playerData[id].login, avatar_url: playerData[id].avatar_url};
	});
	console.log('playerArray:');
	console.log(playerArray);

	// Get names of current and next players based on saved local IDs
	var currentPlayerName = playerData[currentPlayerId].login;
	var nextPlayerName = playerData[nextPlayerId].login;

	console.log('Updating UI with currentPlayerName: ' + currentPlayerName + ', nextPlayerName: ' + nextPlayerName);
	// Update the UI
	updatePlayerListView(playerArray);
	updateCurrentTurnView(currentPlayerName);
	updateNextTurnView(nextPlayerName);
}

// When receiving new myNameView data from server
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
		editor.setReadOnly(true);
	// Otherwise if user's turn is now starting, enable typing/broadcasting!
	} else {
		console.log("User's turn is starting! Setting event listeners accordingly.");
		editor.setReadOnly(false);
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

// Update views for logged in user
function updateLoggedInView (userName, userAvatar) {	
	// Hide loginModalView	
	loginModalView.style.opacity = '0';
	
	window.setTimeout(function(){
		loginModalView.style.display = 'none';
	}, 900);

	// Set myNameView to use GitHub username
	myNameView.textContent = userName;

	// Display user's GitHub avatar image
	var userAvatarElem = document.createElement('img');
  	userAvatarElem.src = userAvatar;
  	userAvatarElem.classList.add('avatar');
  	myNameListItemView.insertBefore(userAvatarElem, myNameView);
}

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
		// Create an <li> node with player's name and avatar
		var playerElement = document.createElement('li');
		playerElement.id = player.id;		

		// Display user's GitHub avatar image
		var userAvatarElem = document.createElement('img');
	  	userAvatarElem.src = player.avatar_url;
  		userAvatarElem.classList.add('avatar');

		// If this player is the current player, highlight their name
		if (player.id === currentPlayerId) {
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

// Update timeLeftView with the time remaining	
function updateTimeLeftView (timerDurationMillis) {

	console.log('updateTimeLeftView CALLED with: ' + timerDurationMillis);

	var turnEndTimestamp = Date.now() + timerDurationMillis;

	// Animate countdown timer
	function step(timestamp) {
		var millisRemaining = turnEndTimestamp - Date.now();

		//console.log('millisRemaining: ' + millisRemaining);

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