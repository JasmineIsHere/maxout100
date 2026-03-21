# Getting Started with Create React App

## Multiplayer Setup (Room Codes)

This app now uses a WebSocket server to power room codes and multiplayer play.

1. Install dependencies:

```
npm install
```

2. Start the WebSocket server (default port 8080):

```
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

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm run server` 

Starts websocket server

### `npm run deploy`

Deploy the app to github pages at https://jasmineishere.github.io/maxout100/
