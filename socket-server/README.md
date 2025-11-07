Socket server for online-classroom (moved to top-level)

Run locally for development testing of whiteboard/chat features:

1. Install dependencies
   npm install

2. Start server
   npm start

The server listens on port 3001 by default. It accepts

- join { room }
- leave { room }
- whiteboard:begin/draw/end
- chat:message

It broadcasts events to the room participants (except the sender).
