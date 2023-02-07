import { io, Socket } from "socket.io-client";

export class MultiplayerFramework {
    public socket: Socket

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

        this.socket.on('initialize', (arg) => {
            console.log("Connected Players: " + arg);
        });
    }

    private Movement(posX, posY) {
        this.socket.emit("sendMovement", posX, posY);
    }
}