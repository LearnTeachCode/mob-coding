# Mob Coding

A mob programming web app for real-time collaboration at in-person events. The goal is to make the most of meetups/classes where a group of people with laptops are all sitting together in a room!

**Table of Contents:**
  - [Learn about mob programming:](#learn-about-mob-programming)
  - [Project Goals](#project-goals)
  - [Project Log](#project-log)

## Learn About Mob Programming:

- [What is mob programming?](https://www.agilealliance.org/glossary/mob-programming/) by the Agile Alliance
- Video: ["Mob Programming, A Whole Team Approach"](https://www.youtube.com/watch?v=8cy64qkgTyI) by Woody Zuill
- Article: ["Introducing Mob programming: The best team technique you've (probably) never heard of"](http://www.infoworld.com/article/2941233/application-development/introducing-mob-programming-the-best-team-technique-youve-probably-never-heard-of.html) by Daniel P. Dern
- [MobProgramming.org and the Mob Programming Conference](http://mobprogramming.org/)

## Project Goals

**Next Goals (for Version 2.0.0):**

- (Done) Simple login system using GitHub authentication

- (Done) Display players' GitHub usernames and profile photos

- (Done) Use a nice code editor for features like line numbers, syntax highlighting, etc (Using [Ace](https://ace.c9.io) for this)

- Save code from each session using GitHub API to make commits!

- And then give credit to each contributor with a commit on every turn change

- Run code within the app and display the output, similar to [repl.it](https://repl.it/) or [CodePen](http://codepen.io/) or [kodeWeave](https://github.com/mikethedj4/kodeWeave) or [Dabblet](https://github.com/LeaVerou/dabblet)

- Add moderator controls (ideas include kicking out players, pausing the game, choosing whose turn it is, changing the timer duration, etc)

- (Maybe) Reintroduce anonymous user feature (just that they don't get credit for their commits, or they can only observe?)

- Add support for multiple game rooms

- Reintroduce non-turn-based collaborative text editor mode

- (Crazy idea for later) Add support for multiplexed/tabbed invididual code editors that users or moderators can watch all at once, like a control room at a TV production studio! Maybe users can set permissions to make their "room" open to collaborators or just to viewers.

**DONE: Goals for Version 1.0.0:**

- Just a turn-based, collaborative plain text box!

- Countdown timer displays the remaining time for each player and resets after each turn

- Players can enter their name or stay anonymous

- Active player list displays names and highlights whose turn it is

- App displays who has the current turn and who has the next turn

- App gets the user's attention somehow when it's their turn

- Tools: NodeJS, Express, SocketIO, plain vanilla JavaScript and HTML/CSS

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
