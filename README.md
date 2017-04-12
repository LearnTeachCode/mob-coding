# Mob Coding

A mob programming web app for real-time collaboration at in-person events. The goal is to make the most of meetups/classes where a group of people with laptops are all sitting together in a room!

## Learn about mob programming:

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

- Did some research on the GitHub API:
  - https://developer.github.com/guides/getting-started/
  - https://developer.github.com/v3/git/commits/#create-a-commit
  - https://mdswanson.com/blog/2011/07/23/digging-around-the-github-api-take-2.html
  - http://github-tools.github.io/github/
  - http://www.nolim1t.co/2017/03/08/uploading-to-github-through-the-API.html
  - https://git-scm.com/book/en/v2/Git-Internals-Git-Objects
  - http://www.levibotelho.com/development/commit-a-file-with-the-github-api  
  - Tangent: What a cool idea for Jekyll blogs! https://github.com/benbalter/jekyllbot

### 2017-04-05

**Milestones:**

- Finished the [GitHub login for static websites tutorial](https://github.com/hoodiehq/camp/issues/106) that I had started last week and now I think I finally understand promises, the point of environment variables, and the basics of GitHub authentication and API requests in general!

- Started new branch (`github-auth`) to require users to log in via GitHub before starting the game

- Finished the user login and GitHub authentication features! Users now have to log in with GitHub before they can play, and the game displays their GitHub username and avatar.

- Did my first live user test at my weekly web dev study group! Got some great feedback on the app and identified a couple bugs (which I think I already fixed in my dev branch).

### 2017-04-06

**Milestones:**

- Finally started using the [Dotenv package](https://www.npmjs.com/package/dotenv) to manage local environment variables.

- Switched to handling GitHub authentication with my own server and learned how to make a new route that makes a POST request from Node and redirects the user back to the homepage with their GitHub access token. Woohoo!

- Set up production version with Heroku environment variables, no more hard-coded URLs or client ID (for now, just using an AJAX request to get the client ID from the server).

- Did a second user test, this time virtually, with [this fun practice problem from r/DailyProgrammer](https://www.reddit.com/r/dailyprogrammer/comments/5e4mde/20161121_challenge_293_easy_defusing_the_bomb/)! Got some good feedback and identified some more bugs.

**Questions:**

- How should I go about generating an "unguessable string" for the `state` parameter for GitHub authentication?

- What's the simplest way to pass a variable from my server to my clients? Do I have to stop using that nifty Express static file server function? Do I need to use a templating system? Is it stupid to use AJAX to request it from the server? (For now, I'm just using an AJAX request.)

- What's the simplest way to make a POST request from my NodeJS server? (**Answered:** Just use http.request method, woohoo!)

**Next steps:** (based on user test feedback)

- Make the code editor take up as much screen real estate as possible!

- Add some way to choose a programming challenge and load in its instructions!

- Display programming challenge instructions separately from the code, so players can read it more easily while others are typing.

- Add some sort of notification system to alert players when it's their turn.

- Fix bug where turn changes before the timer is up!

- Find out why my app crashed or why it kicked out all the clients after a while. Try deploying via Cloud9 instead, see if that makes any difference, and check the logs.

### 2017-04-07

**Milestones:**

- Made my first commit using just the GitHub API (via command line testing it out with cURL)!

- Researched GitHub's features and API more to identify how I could structure this app.

**Next steps for today:**

- My goals for today: 1) make a commit with the GitHub API, and 2) limit myself to work on this project for _only_ 3 hours today (I have lots of other stuff to do, so I can't keep using this as an excuse to procrastinate!)

**Questions:**

- What permissions do I need to make a commit?

- At each step of the process, how do I know if it worked?!

- What are the steps involved, again? I read about them the other night, but I didn't really learn how it all works

- I know I've asked this before and I've learned about it before, but once again, what's a SHA?

- What's a tree, again? (In the context of Git?)

- What's a reference, or ref for short, in Git? ([Answer via Atlassian](https://www.atlassian.com/git/tutorials/refs-and-the-reflog): an indirect way to refer to a commit. For example, branch names, HEAD, etc.)

- What's the best way to save collaborative version history from my mob coding app? A series of commits to a file in a single repo? (Permissions might be tricky or downright impossible here!) Forks of a starter repo with pull requests merged back into it? (Messy?)

- What's the difference between POST and PATCH methods for accessing GitHub's API? Why did POST work for updating a reference, even though the API said to use the PATCH method? Does it matter
?

- How exactly to [GitHub integrations](https://developer.github.com/early-access/integrations/) work, and do I need one to make this app work the way I had envisioned it?

**Notes on making commits with GitHub API:**

- The [GitHub API documentation](https://developer.github.com/v3/git/commits/#create-a-commit) says you can indeed create a commit by sending a POST request to their API endpoint at `/repos/:owner/:repo/git/commits`. You need to provide 1) the commit message, 2) the SHA of the tree object that the commit points to, and 3) the SHAs of the commits that were the parents of this commit (or an array containing a single SHA). Optionally, I can include information about the author/comitter and the timestamp of the commit.

- I just remembered: I should be able to test this all out using cURL! Yup, it worked nicely. I just created a repo! Woohoo!

- So how do I get or create that tree object (and its SHA), and how do I get the SHAs of the commit's parent(s)?

- Neat trick: [here's how Git calculates the SHA1 for a file](http://stackoverflow.com/questions/552659/how-to-assign-a-git-sha1s-to-a-file-without-git/552725#552725)! I also just learned that a "blob" is simply a file.

- Whoa, apparently GitHub gists are actual repos that can be forked and cloned too! See [Forking and Cloning Gists in the GitHub docs](https://help.github.com/articles/forking-and-cloning-gists/).

- So here's an interesting workflow, which may or may not be better than making commits to a repo: maybe in the mob coding session, on each user's turn, they're forking an initial Gist (which simply contains the instructions for the programming challenge) and making edits to it. Then we can see the final version history by looking at the "revisions" page of the fork that belongs to the last user. Ah, that's one big downside though: no permalink to a place to view the final version, because the URL to the final version would constantly be changing, and the previous versions wouldn't show all the history!

- Had a fun tangent exploring creative uses of GitHub gists for code previews, text adventure games, minimal blog posts, and more. Something to think about for later!

- OK, so back on track. I've at least determined that gists are not going to work well for what I want to do. But I'm still not sure what the best implementation is. More on that later, I guess. Back to learning about making commits with the GitHub API!

- Found the [GitHub Trees API](https://developer.github.com/v3/git/trees/) and the [References API](https://developer.github.com/v3/git/refs/). There's also the [Blobs API](https://developer.github.com/v3/git/blobs/)!

- Comparing the steps outlined in these blog posts: ["Making a commit with the GitHub API"](https://mdswanson.com/blog/2011/07/23/digging-around-the-github-api-take-2.html) by Matt Swanson, ["Uploading to GitHub Through the API"](http://www.nolim1t.co/2017/03/08/uploading-to-github-through-the-API.html) by "nomim1t", and ["Commit a file with the GitHub API"](http://www.levibotelho.com/development/commit-a-file-with-the-github-api) by Levi Botelho.

- Looks like everyone agrees that the first step is to get a reference to the HEAD of the desired branch by making a GET request to `/repos/:user/:repo/git/refs/heads/:branch` and save the SHA (and URL?) of the commit that the HEAD points to, which is the latest commit. Testing it out now... It works!

- The blog posts I found differ on the order here, but the next step is either to get the SHA of the tree of the last commit or create a blob. But Matt Swanson says in his blog post that he skipped manually creating the blog, "since setting tree.content automatically builds one for you". Maybe I'll try it that way!

- OK, so my step two is this: make a GET request to object.url (which I received from the request I made for step 1), and then from _that_ request, save the tree.sha value.

- For step three, I tried following Matt Swanson's trick, but no luck! Then I realized that blog post is from 2011, while the others are from 2014 and 2017. SO maybe the API changed. Oh well.

- Trying a different step three: create a blob (a new file) by making a POST request to `/repos/:user/:repo/git/blobs` with a payload like this: `'{"content": "# Hello World", "encoding": "utf-8"}` and save the SHA returned by the response.

- Step four: create a new tree by creating another POST request to `/repos/:user/:repo/git/trees/` with the following payload: `'{"base_tree": "' + [tree.SHA from step two's response] + '", "tree": [{"path": "test.md", "mode": "100644", "type": "blob", "sha": "' + [top-level SHA from step three's response] + '"}]"}'` and then from this next response, save the top-level SHA, which is the SHA of the newly-created tree!

- Step five: finally make the commit with a POST request to `/repos/:user/:repo/git/commits` with the payload `'{"parents": ["' + [SHA of the commit from step two's response] + '"], "tree": "' + [SHA of the tree created in step four] + '", "message": "Testing remote commit via GitHub API"}'` and then save the SHA of the newly-created commit from the response!

- Step six: move the HEAD ref to point to the new commit by making a PATCH request (or POST request?) to `/repos/:user/:repo/git/refs/:ref` where :ref is replaced with `heads/:branch` with the payload `'{"sha": "' + [SHA of the new commit from step five] + '"}'`

- _Success!!!_ It worked! Wow, I feel so much more comfortable now with the GitHub API and with how Git commits actually work. So cool! Next I just need to translate these steps into JavaScript code that can run on my server. And work out the whole permissions issue.

**Notes on permissions and workflow issues using GitHub API:**

- The [Collaborators API](https://developer.github.com/v3/repos/collaborators/) does allow you to add users as collaborators for a repo, but only if the repo is owned by an organization. Hmm, that works fine for me! Using this method, they would be ["outside collaborators"](https://help.github.com/articles/adding-outside-collaborators-to-repositories-in-your-organization/). But I can also use the [Teams API](https://developer.github.com/v3/orgs/teams/) to create a new team, add members to it, and give the team permissions to make commits to a repo! I can even use the [Members API](https://developer.github.com/v3/orgs/members/) to add users to my organization. But the catch with all that is I can only do that from _my_ account.

- I might need to make this app as a [GitHub Integration](https://github.com/integrations) but I'm not sure which parts of the API currently support integrations. Hrmm. The [GitHub docs for integrations](https://developer.github.com/early-access/integrations/) still calls it an "early access" feature. This is the key part that interests me: "an Integration can act on its own behalf — taking actions via the API directly instead of impersonating a user." But then this part makes me think maybe I shouldn't be using an integration after all: "While an Integration can perform certain actions on behalf of users, it should primarily use its own identity when performing its function."

- The [Pull Requests API](https://developer.github.com/v3/pulls/) does allow me to create a new pull request on behalf of a user. And the [Repos/forks API](https://developer.github.com/v3/repos/forks/) lets me create a fork on behalf of a user.

- So it looks like option 1 for the flow of this app looks like this: each user forks my starter repo, makes a commit, makes a pull request, and then I guess I'd need to use an integration installed on my organization account to programmatically accept those pull requests. The tricky part: how would I update each user's fork to pull latest changes from the central repo? Also, this would make the central repo potentially very messy! Unless every game session was saved as a separate file or separate branch... but then that's messy too!

- I just realized that my idea for option 2 (having each user make a commit directly to a shared repo) would be impossible... at least without an organization-level integration to automatically add every player as a collaborator on the repo! Yup, just confirmed that both [adding collaborators](https://developer.github.com/v3/repos/collaborators/#add-user-as-a-collaborator) and [adding team members](https://developer.github.com/v3/orgs/teams/#add-or-update-team-membership) are only allowed for organizations.

### 2017-04-10

**Today's daily learning blog post: http://learningnerd.com/2017/04/10/**

**Milestones:**

- Started keeping learning notes in my blog, instead of just dumping them all in here. (Better to reserve this doc just for short summaries.)

- After a lot of wasted time because of a couple typos, I successfully created a new GitHub gist from within my app using a client-side AJAX POST request to the GitHub API!

### 2017-04-11

**Today's daily learning blog post: http://learningnerd.com/2017/04/11/**

**Milestones:**

- Successfully created, forked, and edited a gist using the GitHub API!
- Integrated new events and logic flow into the app for saving version history using GitHub gists!
- The app can now create and edit gists on each user's turn, but not working for forks yet.

### 2017-04-12

**Today's daily learning blog post: http://learningnerd.com/2017/04/12/**

**Milestones:**