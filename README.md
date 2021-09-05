## Connect Four Game Server

#### Install
    yarn

#### Run Dev
    yarn start

## What's going on?
    This is express server and socket.io game server at once. Express handles authentication and must run as https to be secure. The game server doesn't require any secure connection as it communicates via an ephemeral (AES256) key provided during authentication with the express server.