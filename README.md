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

### UML state machine diagram

High-level, simplified state chart:

![Mob coding version 1.0.0 state chart](https://learningnerd.com/images/mobcoding-statechart-highlevel-2017-06-30.svg)

### Flowchart

![Mob coding version 1.0.0 flowchart](https://learningnerd.com/images/mobcoding-flowchart-2017-06-29.svg)

### Game state

**Note:** As of 2017-07-10, client-side game state currently handles the editor content differently, using a separate Ace Editor object instead.

```
{
  timeRemaining,
  turnIndex,
  currentGist: {id, url, owner},
  players:
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
```

### Events List

| Event Name | Sent By | Sent To | Data | Description |
|---|---|---|---|---|
| `playerJoined` |  Client   |  Server | `{login, avatar_url}`  |  When new player completes login process |
| `playerJoined` |  Server |  All *other* clients | `{id, login, avatar_url}`  |  Update other clients with new player data |
| `gameState` |  Server |  One client | See game state model in section above!  |  Initialize game state for new player that just logged in, and trigger new gist creation if game is just starting! |
| `playerLeft` |  Server |  All *other* clients | `id` |  Update other clients to remove disconnected player |
| `turnChange` |  Server |  All clients | `onDisconnect` (Boolean)  |  Trigger clients to change the turn |
| `newGist` |  Client |  Server  |  `{id, url, owner}`  |  Broadcast new Gist data |
| `editorTextChange` |  Client   |  Server  |  `"current content, just a string!"`  |  Broadcast changes to code editor content |
| `editorCursorChange` |  Client   |  Server | `{ cursor: {column, row}, range: { end: {column, row}, start: {column, row} }`  |  Broadcast cursor moves or selection changes |
| `editorScrollChange` |  Client   |   Server | `{scrollLeft, scrollTop}`  |  Broadcast changes to code editor content  |
| `disconnect` |   Client  |  Server |  ...   |  When clients disconnect from server (SocketIO function) |
| `connection` |  Client   |  Server |  ...  |  When clients connect to server (SocketIO function)  |


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
- Started refactoring and closed [issue #1](https://github.com/LearnTeachCode/mob-coding/issues/1).

### 2017-06-28

**Today's daily learning blog post: https://learningnerd.com/2017/06/28/**

**Milestones:**

- Finally got the app working again!!! Successful live user test at tonight's web dev study meetup! (The server never crashed!)

- Added updated flowchart and events list to this README for [version 1.0.0 documentation](#version-100-documentation).

- Fixed the main (most obvious) bug, closing [issue #8 ("Error thrown when client calls updateCurrentGistView the first time to create initial Gist")](https://github.com/LearnTeachCode/mob-coding/issues/8)!

- Closed [issue #3 ("Simplify client-side code for determining when to fork/edit Gist")](https://github.com/LearnTeachCode/mob-coding/issues/3), which lead to opening [issue #20 ("Game state should track previous and current player for Gist forking/editing logic")](https://github.com/LearnTeachCode/mob-coding/issues/20), which I closed with [pull request #25](https://github.com/LearnTeachCode/mob-coding/pull/25), which then led to opening [issue #24 ("If current player disconnects, next turn can trigger unwanted Gist fork")](https://github.com/LearnTeachCode/mob-coding/issues/24).

### 2017-06-29

**Today's daily learning blog post: https://learningnerd.com/2017/06/29/**

**Milestones:**

- Realized most of yesterday's work was based on an incorrect assumption, so threw out [pull request #25](https://github.com/LearnTeachCode/mob-coding/pull/25) and replaced  [issue #20](https://github.com/LearnTeachCode/mob-coding/issues/20) and [issue #24](https://github.com/LearnTeachCode/mob-coding/issues/24) with [issue #26 ("Game state should track Gist owner for forking/editing logic")](https://github.com/LearnTeachCode/mob-coding/issues/26) -- a much better solution!

- Closed [issue #26](https://github.com/LearnTeachCode/mob-coding/issues/26), solving that bug once and for all! Updated the flowchart accordingly.

### 2017-06-30

**Today's daily learning blog post: https://learningnerd.com/2017/06/30/**

**Milestones:**

- Created high-level UML state machine diagram, added to this README for [version 1.0.0 documentation](#version-100-documentation).

### 2017-07-03

**Today's daily learning blog post: https://learningnerd.com/2017/07/03/**

**Milestones:**

- Closed [#issue #4 ("Change game start condition to check state of the player list")](https://github.com/LearnTeachCode/mob-coding/issues/4)

- Opened [issue #29 ("Sometimes when last user disconnects (maybe while turn is changing?), server crashes")](https://github.com/LearnTeachCode/mob-coding/issues/29)

- Merged [issue #5 ("Consolidate the playerListChange and updateState events")](https://github.com/LearnTeachCode/mob-coding/issues/5) into [issue #16 ("Simplify the game state data model and events on client and server")](https://github.com/LearnTeachCode/mob-coding/issues/16) and updated issue #16.

- Finished initial rewrite of events list and game state data model, started the major refactoring task for issue #16, stripping out all the guts of this app and replacing them all!

### 2017-07-10

**Today's daily learning blog post: https://learningnerd.com/2017/07/10/**

**Milestones:**

- Main refactoring task completed! Finally closed [issue #16 ("Simplify the game state data model and events on client and server")](https://github.com/LearnTeachCode/mob-coding/issues/16), also closing [issue #18](https://github.com/LearnTeachCode/mob-coding/issues/18) and [issue #14](https://github.com/LearnTeachCode/mob-coding/issues/14) in the process!

- Added game state and updated events list for [version 1.0.0 documentation](#version-100-documentation) in this README.

- Closed [issue #15 ("Send GitHub access token as a header, not as a URL parameter")(https://github.com/LearnTeachCode/mob-coding/issues/15)! Not sure if this is the best solution, but I can't think of a better way to handle client-side authentication without sessions.
