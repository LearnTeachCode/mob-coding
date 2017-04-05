# Mob Coding

A mob programming web app for real-time collaboration at in-person events. The goal is to make the most of meetups/classes where a group of people with laptops are all sitting together in a room!

## Learn about mob programming:

- [What is mob programming?](https://www.agilealliance.org/glossary/mob-programming/) by the Agile Alliance

- Video: ["Mob Programming, A Whole Team Approach"](https://www.youtube.com/watch?v=8cy64qkgTyI) by Woody Zuill

- Article: ["Introducing Mob programming: The best team technique you've (probably) never heard of"](http://www.infoworld.com/article/2941233/application-development/introducing-mob-programming-the-best-team-technique-youve-probably-never-heard-of.html) by Daniel P. Dern

- [MobProgramming.org and the Mob Programming Conference](http://mobprogramming.org/)

## Project Goals

**Goals for Version 1.0.0:**

- Just a turn-based, collaborative plain text box!
- Countdown timer displays the remaining time for each player and resets after each turn
- Players can enter their name or stay anonymous
- Active player list displays names and highlights whose turn it is
- App displays who has the current turn and who has the next turn
- App gets the user's attention somehow when it's their turn
- Tools: NodeJS, Express, SocketIO, plain vanilla JavaScript and HTML/CSS


## Project Log

### 2017-03-28

**Questions:**

- Should the server ensure that the countdown timers are synced across all clients?

- How should I set a timer on the server to control changing turns?

- What exactly does the server need to keep track of?

- How should I prevent a user from typing in the text box when it's not their turn?

- Should I throttle the amount of data/events being sent when users are typing? How well would it perform if I sent data on every keystroke?

**Outlining events and functions that I'll need:**

- Event: when users connect
- Event: when a user types into the text box
- Event: when it's time to change turns
- Event: when users disconnect
- Event: when a user changes their name
- Event: clock tick, to keep clients in sync?

- Client function: update player list, given data from server
- Client function: send text box data to server
- Client function: update text box, given data from server
- Client function: update UI when turn changes, given data from server
- Client function: update the countdown timer at a regular interval
- Server function: track elapsed time and broadcast turn change event at the right time
- Server function: receive and broadcast events based on data from clients
- Server function: broadcast events when users connect or disconnect
- Server state: keep track of list of user IDs, names, whose turn it is, who's next, and elapsed time for each turn


### 2017-03-29

**Milestones:**

- Version 0 (branch `v0-shared-editor`): collaborative real-time text-editing now works, yay! Just a simple shared text editor.

**Questions:**

- What's the difference between the [`input` event](https://developer.mozilla.org/en-US/docs/Web/Events/input) and something like `keyup`? (Apparently `input` fires only if it changes the input, whereas `keyup` fires for pressing any key, even one that doesn't actually type anything. Not supported in IE < 9.)

- Is there a nifty library for styling console.log messages? (Or I can just write my own helper function.)

- How do I commit new changes into a new branch in Git? ([Simple answer via StackOverflow](http://stackoverflow.com/a/1394804) )


### 2017-03-31

**Milestones:**

- Finished and cleaned up version 0 (`branch v0-shared-editor`), collaborative real-time text-editing (no turn-based system).

- Version 1 (branch `v1-turnbased-simple`) with turn-based system now works!

**Questions:**

- When a user is temporarily disconnected and then reconnects, what's the best way to maintain their state in the game? (Currently they lose their place in the turn order, and their username is reset.)

- How can I prevent the user from typing into the text box but still allow the user to use the keyboard to navigate/select/copy the text when it's not their turn?

### 2017-04-03

**Milestones:**

- New feature: added [Ace (an open source embeddable code editor)](https://ace.c9.io) to replace the plain text box, and it works great!

**Questions:**

- What's the best way to sync the state of the Ace code editors across users? Should I pass around the session object like in [this StackOverflow answer](http://stackoverflow.com/a/20404474), or handle selection change, cursor change, and similar events individually?

### 2017-04-04

**Milestones:**

- Ace editor now syncs scroll, cursor, and selection changes between all clients!