# Mob Coding

A mob programming web app for real-time collaboration at in-person events. The goal is to make the most of meetups/classes where a group of people with laptops are all sitting together in a room!

**Table of Contents:**
  - [Learn About Mob Programming](#learn-about-mob-programming)
  - [Project Goals](#project-goals)
    - [Next Goals (for Version 2.0.0)](#next-goals-for-version-200)
    - [Goals for Version 1.0.0 (DONE!)](#goals-for-version-100-done)
  - [Version 1.0.0 Documentation](#version-100-documentation)
    - [Events List](#events-list)
    - [Flowchart](#flowchart)
  - [Project Log](#project-log)


## Learn About Mob Programming

- [What is mob programming?](https://www.agilealliance.org/glossary/mob-programming/) by the Agile Alliance
- Video: ["Mob Programming, A Whole Team Approach"](https://www.youtube.com/watch?v=8cy64qkgTyI) by Woody Zuill
- Article: ["Introducing Mob programming: The best team technique you've (probably) never heard of"](http://www.infoworld.com/article/2941233/application-development/introducing-mob-programming-the-best-team-technique-youve-probably-never-heard-of.html) by Daniel P. Dern
- [MobProgramming.org and the Mob Programming Conference](http://mobprogramming.org/)

## Project Goals

### Next Goals (for Version 2.0.0)

- (Done) Simple login system using GitHub authentication
- (Done) Display players' GitHub usernames and profile photos
- (Done) Use a nice code editor for features like line numbers, syntax highlighting, etc (Using [Ace](https://ace.c9.io) for this)
- (Done) Save code from each session in a Gist using GitHub API and give credit to each contributor accordingly!
- Run code within the app and display the output, similar to [repl.it](https://repl.it/) or [CodePen](http://codepen.io/) or [kodeWeave](https://github.com/mikethedj4/kodeWeave) or [Dabblet](https://github.com/LeaVerou/dabblet)
- Add moderator controls (ideas include kicking out players, pausing the game, choosing whose turn it is, changing the timer duration, etc)
- (Maybe) Reintroduce anonymous user feature (just that they don't get credit for their commits, or they can only observe?)
- Add support for multiple game rooms
- Reintroduce non-turn-based collaborative text editor mode
- (Crazy idea for later) Add support for multiplexed/tabbed invididual code editors that users or moderators can watch all at once, like a control room at a TV production studio! Maybe users can set permissions to make their "room" open to collaborators or just to viewers.

### Goals for Version 1.0.0 (DONE!)

- Just a turn-based, collaborative plain text box!
- Countdown timer displays the remaining time for each player and resets after each turn
- Players can enter their name or stay anonymous
- Active player list displays names and highlights whose turn it is
- App displays who has the current turn and who has the next turn
- App gets the user's attention somehow when it's their turn
- Tools: NodeJS, Express, SocketIO, plain vanilla JavaScript and HTML/CSS


## Version 1.0.0 Documentation

### Flowchart

![Updated mob coding flowchart](https://learningnerd.com/images/mobcoding-flowchart-2017-06-28.svg)

### Events List

<table>
  <thead>
    <tr>
      <th>Event Name</th>
      <th>Description</th>
      <th>Server Actions</th>
      <th>Client Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>connection</td>
      <td>When client connects to SocketIO</td>
      <td>Start the whole app!</td>
      <td><em>Not used</em></td>      
    </tr>
    <tr>
      <td>disconnect</td>
      <td>When a client disconnects from SocketIO</td>
      <td>        
          Remove disconnected user from playerList.<br><br>
          If no logged-in players are left, reset the game!<br><br>
          If the disconnected user was the current player, restart timer and change the turn!<br><br>
          Broadcast "updateState" to all other clients.<br><br>
          Broadcast "playerListChange" to all other clients.<br><br>        
      </td>
      <td>Stop the timer view.</td>
    </tr>
    <tr>
      <td>userLogin</td>
      <td>When server confirms a client is logged in</td>
      <td>        
          Add user info to playerList.<br><br>
          Send current state of the text editor to the new client, broadcasting "editorTextChange", "editorCursorChange", and "editorScrollChange" if needed.<br><br>
          If first user, initialize the game!<br><br>
          Broadcast  "updateState" to <em>all</em> clients.<br><br>
          Broadcast "playerListChange" to <em>all</em> clients.<br><br>        
      </td>
      <td>Upon successful GitHub authentication, send "userLogin" event and user data to the server.</td>
    </tr>
    <tr>
      <td>playerListChange</td>
      <td>When server confirms a player has joined or left</td>
      <td>Broadcast player list to clients, triggered by "userLogin" and "disconnect" events.</td>
      <td>Update UI for player list, current turn, and next turn.</td>
    </tr>
    <tr>
      <td>updateState</td>
      <td>When game state changes and clients need to be synced up</td>
      <td>Broadcast game state to <em>all</em> clients, triggered by "userLogin" and "disconnect" events.</td>
      <td>
        Update local state.<br><br>
        Update UI for Gist link, highlighted player names, timer, current turn, and next turn.<br><br>        
      </td>
    </tr>
    <tr>
      <td>turnChange</td>
      <td>When the server's timer is up, pass control to the next player.</td>
      <td>Broadcast turn data to <em>all</em> clients when the timer is up.</td>
      <td>        
          Add user info to playerList.<br><br>
          Fork/edit the Gist, which may broadcast "newGistLink" and update Gist UI if needed.<br><br>
          Update local state.<br><br>
          Toggle editor read-only mode.<br><br>
          Update UI for highlighted player names, timer, current turn, and next turn.<br><br>        
      </td>
    </tr>
    <tr>
      <td>createNewGist</td>
      <td>When the game begins, create a new Gist on behalf of the first player.</td>
      <td>Broadcast event to first player once logged in, if starting a new game.</td>
      <td>        
          Create a Gist for the current user.<br><br>
          Broadcast "newGistLink" to server.<br><br>
          Update Gist UI.       
      </td>        
    </tr>
    <tr>
      <td>newGistLink</td>
      <td>When a new Gist is created or forked, sync up clients to display the new link.</td>
      <td>Update game state and broadcast "newGistLink" to all other clients.</td>
      <td>Update local state and update Gist UI.</td>
    </tr>
    <tr>
      <td>Ace Editor: change</td>
      <td>When a user types in the editor</td>
      <td><em>Not used</em></td>
      <td>
        Update editor view with new content.<br><br>
        Send "editorTextChange" event with data to server.
      </td>
    </tr>
    <tr>
      <td>Ace Editor: changeCursor</td>
      <td>When a user moves the editor cursor</td>
      <td><em>Not used</em></td>
      <td>
        Update cursor in editor view.<br><br>
        Send "editorCursorChange" event with data to server.
      </td>
    </tr>
    <tr>
      <td>Ace Editor: changeScrollLeft and changeScrollTop</td>
      <td>When a user scrolls in the editor</td>
      <td><em>Not used</em></td>
      <td>
        Update scroll position in editor view.<br><br>
        Send "editorScrollChange" event with data to server.
      </td>
    </tr>
    <tr>
      <td>editorTextChange</td>
      <td>When a user types in the editor, sync the content across all clients.</td>
      <td>        
          Update local state.<br><br>
          Verify that the data was sent from the current user -- to prevent cheating!<br><br>
          Broadcast "editorTextChange" with updated content to all other clients.<br><br>        
      </td>
      <td>Update editor view with new content.</td>
    </tr>
    <tr>
      <td>editorCursorChange</td>
      <td>When a user moves the editor cursor, sync across all clients.</td>
      <td>        
          Update local state.<br><br>
          Verify that the data was sent from the current user -- to prevent cheating!<br><br>
          Broadcast "editorCursorChange" with updated content to all other clients.<br><br>        
      </td>
      <td>Update cursor in editor view.</td>
    </tr>
    <tr>
      <td>editorScrollChange</td>
      <td>When a user scrolls in the editor, sync across all clients.</td>
      <td>        
          Update local state.<br><br>
          Verify that the data was sent from the current user -- to prevent cheating!<br><br>
          Broadcast "editorScrollChange" with updated content to all other clients.<br><br>        
      </td>
      <td>Update scroll position in editor view.</td>
    </tr>
  </tbody>
</table>

## Project Log

### 2017-03-28

**Today's notes: https://learningnerd.com/2017/03/28/**

**Milestones:**

- Started this project! Created the repo, created HTML mockup for the UI, wrote the first set of project goals.

### 2017-03-29

**Today's notes: https://learningnerd.com/2017/03/39/**

**Milestones:**

- Version 0 (branch `v0-shared-editor`): collaborative real-time text-editing now works, yay! Just a simple shared text editor.

### 2017-03-31

**Today's notes: https://learningnerd.com/2017/03/31/**

**Milestones:**

- Finished and cleaned up version 0 (`branch v0-shared-editor`) with collaborative real-time text-editing (no turn-based system).

- Version 1 (branch `v1-turnbased-simple`) with turn-based system now works!

### 2017-04-03

**Milestones:**

- New feature: added [Ace (an open source embeddable code editor)](https://ace.c9.io) to replace the plain text box, and it works great!

### 2017-04-04

**Milestones:**

- Ace editor now syncs scroll, cursor, and selection changes between all clients!

### 2017-04-05

**Milestones:**

- Finished the [GitHub login for static websites tutorial](https://github.com/hoodiehq/camp/issues/106) that I had started last week and now I think I finally understand promises, the point of environment variables, and the basics of GitHub authentication and API requests in general!

- Started new branch (`github-auth`) to require users to log in via GitHub before starting the game

- Finished the user login and GitHub authentication features! Users now have to log in with GitHub before they can play, and the game displays their GitHub username and avatar.

- Did my first live user test at my weekly web dev study group! Got some great feedback on the app and identified a couple bugs (which I think I already fixed in my dev branch).

### 2017-04-06

**Today's notes: https://learningnerd.com/2017/04/06/**

**Milestones:**

- Finally started using the [Dotenv package](https://www.npmjs.com/package/dotenv) to manage local environment variables.

- Switched to handling GitHub authentication with my own server and learned how to make a new route that makes a POST request from Node and redirects the user back to the homepage with their GitHub access token. Woohoo!

- Set up production version with Heroku environment variables, no more hard-coded URLs or client ID (for now, just using an AJAX request to get the client ID from the server).

- Did a second user test, this time virtually, with [this fun practice problem from r/DailyProgrammer](https://www.reddit.com/r/dailyprogrammer/comments/5e4mde/20161121_challenge_293_easy_defusing_the_bomb/)! Got some good feedback and identified some more bugs.

### 2017-04-07

**Today's notes: https://learningnerd.com/2017/04/07/**

**Milestones:**

- Made my first commit using just the GitHub API (via command line testing it out with cURL)!

- Researched GitHub's features and API more to identify how I could structure this app.

### 2017-04-10

**Today's daily learning blog post: https://learningnerd.com/2017/04/10/**

**Milestones:**

- Started keeping learning notes in my blog, instead of just dumping them all in here. (Better to reserve this doc just for short summaries.)

- After a lot of wasted time because of a couple typos, I successfully created a new GitHub gist from within my app using a client-side AJAX POST request to the GitHub API!

### 2017-04-11

**Today's daily learning blog post: https://learningnerd.com/2017/04/11/**

**Milestones:**

- Successfully created, forked, and edited a gist using the GitHub API!
- Integrated new events and logic flow into the app for saving version history using GitHub gists!
- The app can now create and edit gists on each user's turn, but not working for forks yet.

### 2017-04-12

**Today's daily learning blog post: https://learningnerd.com/2017/04/12/**

**Milestones:**

- Fixed the turn change logic to work properly with saving version history using the GitHub Gists API.

### 2017-04-13

**Today's daily learning blog post: https://learningnerd.com/2017/04/13/**

**Milestones:**

- Fixed the bug where any code written in the delay between forking and editing a gist gets attributed to the wrong player.

### 2017-04-13

**Today's daily learning blog post: https://learningnerd.com/2017/04/13/**

**Milestones:**

- Fixed the bug where any code written in the delay between forking and editing a gist gets attributed to the wrong player.

### 2017-06-21

**Today's daily learning blog post: https://learningnerd.com/2017/06/21/**

**Milestones:**

- Moved some notes from this README into separate blog posts, added Table of Contents to README.
- Fixed setup script so that it no longer overwrites the `.env` file if it already exists.

### 2017-06-27

**Today's daily learning blog post: https://learningnerd.com/2017/06/27/**

**Milestones:**

- Finally posted [a bunch of issues](https://github.com/LearnTeachCode/mob-coding/issues) for next refactoring tasks, bugs, and feature ideas.
- Started refactoring and closed issue #1.
