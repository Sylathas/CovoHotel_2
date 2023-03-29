// Covo Hotel Back-End
// Developed by Fenice @ Tech Dept.
// Node.js Web Framework

import path from 'path'

// Express and HTML Request Setup
const express = require('express');
const app = express(),
            DIST_DIR = __dirname,
            HTML_FILE = path.join(DIST_DIR, 'index.html');
app.use(express.static(DIST_DIR));
const http = require('http');
const server = http.createServer(app);
//const startingTime = process.argv;
const PORT = 8080;

// Socket.io
const { Server } = require("socket.io");
const io = new Server(server);
var connectedPlayers = {};

// Send Index.html To Client
app.get('*', (req, res) => {
  res.sendFile(HTML_FILE)
})

// Server starts listen @ PORT
server.listen(PORT, () => {
  process.argv.forEach((val, index) => {
    console.log(`${index}: ${val}`);
  });
  console.log('App listening to ' + PORT + " with starting time set to " /*+ Date(startingTime * 1000) + " with UnixTime: " + startingTime*/);
  console.log('Press Ctrl+C to quit.')
})

// Socket Events
// Socket Connected
io.on("connection", (socket) => {

    //Connection Event
    console.log("User Connected");
    socket.broadcast.emit('newPlayer', socket.id);
    io.to(socket.id).emit("initialize", startingTime, JSON.stringify(connectedPlayers));
    connectedPlayers[socket.id] = new Player(socket.id, "player.glb", 0, 0, 0);

    // User Disconnect
    socket.on('disconnect', () => {
      console.log('User Disconnected');
      socket.broadcast.emit('deletePlayer', socket.id);
      delete connectedPlayers[socket.id]; //Remove from Connected Player List
    });

    //Player Movement
    socket.on('playerMoving', (posX, posY, posZ) => {
      connectedPlayers[socket.id].posX = posX;
      connectedPlayers[socket.id].posY = posY;
      connectedPlayers[socket.id].posZ = posZ;
      socket.broadcast.emit('playerMoved', socket.id, posX, posY, posZ);
    });

});

//Defining Player Class
class Player {
  constructor(id, skin, posX, posY, facing) {
    this.id = id;
    this.skin = skin;
    this.posX = posX;
    this.posY = posY;
    this.facing = facing;
  }
}

// Timeout feature for Socket
const withTimeout = (onSuccess, onTimeout, timeout) => {
  let called = false;

  const timer = setTimeout(() => {
    if (called) return;
    called = true;
    onTimeout();
  }, timeout);

  return (...args) => {
    if (called) return;
    called = true;
    clearTimeout(timer);
    onSuccess.apply(this, args);
  }
}