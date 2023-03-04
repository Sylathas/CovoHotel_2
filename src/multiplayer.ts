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
    }
}

export let theFramework = new MultiplayerFramework;