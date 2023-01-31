// Covo Hotel Back-End
// Developed by Fenice @ Tech Dept.
// Node.js Web Framework

import path from 'path'

// Express and HTML Request Setup
const express = require('express');
const app = express(),
            DIST_DIR = __dirname,
            HTML_FILE = path.join(DIST_DIR, 'index.html')
app.use(express.static(DIST_DIR))
const http = require('http');
const server = http.createServer(app);
const PORT = process.env.PORT || 8080

// Socket.io
const { Server } = require("socket.io");
const io = new Server(server);

// Send Index.html To Client
app.get('*', (req, res) => {
  res.sendFile(HTML_FILE)
})

// Server starts listen @ PORT
server.listen(PORT, () => {
  console.log(`App listening to ${PORT}....`)
  console.log('Press Ctrl+C to quit.')
})

// Socket Events
// Socket Connected
io.on("connection", (socket) => {
    console.log("User Connected");
    socket.broadcast.emit('newPlayer');
    // User Disconnect
    socket.on('disconnect', () => {
      console.log('User Disconnected');
    });
});