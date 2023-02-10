import { io, Socket } from "socket.io-client";

class MultiplayerFramework {
    socket: Socket

    constructor() {
        this.socket = io()

        this.socket.on('connect', function () {
            console.log('Connected to Covo Multiplayer System');
        });

        this.socket.on('disconnect', function (message: any) {
            console.log('Disconnected from Covo Multiplayer System' + message);
            location.reload()
        });

        this.socket.on('newPlayer', (arg) => {
            console.log("A new player joined with id: " + arg);
        });

        this.socket.on('deletePlayer', (arg) => {
            console.log("Player " + arg + " just disconnected from the server");
        });
    }
}

export let theFramework = new MultiplayerFramework;