# Maxout 100
## About the game
This is a game that can be played in person with a deck of poker cards.

The game starts with each player being dealt with 2 cards in hand and the players choose a person to start the game. The starting player will have to play a card on hand and add it to the "count" pile where the value of the card will be added on each turn. 

> Example, if 7 is played, 7 is added to the total value of the "count" pile. If 5 is played by the next player, the total value of the "count" pile becomes 12 (7 + 5). 

Each player will end their turn by drawing a card from the remaining pile of cards so that each player will always have 2 cards on hand.

The goal of the game is to be the last player to reach 100 or as close to it as possible to be the last player standing. If both cards on your hand will result in the total value of the "count" pile to exceed 100, you do not have any playable cards and you are considered out.

There are a few special cards with players can play with different rules:
- J: Skip the next player's turn
- Q: Holds the value of -30 or 30 (decided by the player) when placed in the "count" pile
- K: Kills another player
- 4: Reflects an action played on the player. Or can be used as a normal numbered card.
- Ace of Spades: Resets the "count" pile to 0
<br><br>

![Screenshot of the lobby screen](/public/lobby.png)
![Screenshot of the game start where player can see their hand](/public/game-start.png)
![Screenshot of the game in progress where players can see the game log](/public/game-in-progress.png)



## Running Locally
### Multiplayer Setup (Room Codes)

This app now uses a WebSocket server to power room codes and multiplayer play.

1. Install dependencies:

```
npm install
```

2. Start the WebSocket server (default port 8080):

```
cd server
npm run server
```

3. Start the React app:

```
npm start
```

If you host the server elsewhere, set `REACT_APP_WS_URL` to point at it (for example: `ws://your-host:8080`).

### Local production deploy to GitHub Pages

If you use `npm run deploy` locally, add a `.env.production.local` file (not committed) so the build picks up the deployed WebSocket URL.

Example:

```
REACT_APP_WS_URL=wss://your-host.onrender.com
```

### `npm run deploy`

Deploy the app to github pages at https://jasmineishere.github.io/maxout100/

## FAQs
### Why is the room not being created? Why I can't join a room?
This is because the web socket server is not hosted 24/7 and it may be shutdown if there are no usage. If you face issue where you are unable to create a room or join a room and do not wish to run this locally, please contact me at jasmineiscodinghere@gmail.com
