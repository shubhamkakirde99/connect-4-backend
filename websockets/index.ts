import WebSocket from "ws";

import { ROWS, COLS, handlePlayMove } from "../game_utils";

type PlayerData = {
  name: string;
  conn: WebSocket;
};

type GameState = {
  gridState: number[][];
  currentTurn: 1 | 2;
  isGameOn?: boolean;
  winner?: 0 | 1 | 2;
};

type ActiveRoomsType = {
  [roomName: string]: {
    p1Data?: PlayerData;
    p2Data?: PlayerData;
    gameState: GameState;
  };
};

export default async (expressServer: any, db: any) => {
  const websocketServer = new WebSocket.Server({
    noServer: true,
    path: "/ws",
  });

  const activeRooms: ActiveRoomsType = {};

  const createRoom = async (
    userName: string | null,
    websocketConnection: any
  ) => {
    let collection = await db.collection("active_games");
    const roomName = (Math.random() + 1).toString(36).substring(6);
    let results = await collection.insertOne(
      { p1: userName || "", p1Active: true, roomName },
      (err: any, res: any) => {
        console.log("inside insert callback");
      }
    );
    console.log("insert results are: ", results);
    websocketConnection.send(
      JSON.stringify({ type: "room_created", payload: { roomName } })
    );
    return roomName;
  };

  const handleJoinGame = async (
    userName: string | null,
    roomName: string | null
  ) => {
    const updateQuery = {
      $set: {
        p2: userName,
        p2Active: true,
      },
    };
    await db.collection("active_games").updateOne({ roomName }, updateQuery);
  };

  const deleteRoom = async (roomName: any) => {
    console.log("deleting: ", roomName);
    await db.collection("active_games").deleteOne({ roomName });
  };

  const handleClientDisconnect = async (
    userName: string | null,
    roomName: string | null
  ) => {
    let result = await db.collection("active_games").findOne({ roomName });
    console.log("found doc: ", result);
    const isP1 = result.p1 === userName ? true : false;
    if (
      (isP1 && result?.p2Active !== true) ||
      (!isP1 && result?.p1Active !== true)
    ) {
      deleteRoom(roomName);
    } else {
      let updateQuery;
      if (isP1) {
        updateQuery = { $set: { p1Active: false } };
      } else {
        updateQuery = { $set: { p2Active: false } };
      }
      await db.collection("active_games").updateOne({ roomName }, updateQuery);
    }
  };

  expressServer.on("upgrade", (request: any, socket: any, head: any) => {
    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit("connection", websocket, request);
    });
  });

  websocketServer.on(
    "connection",
    async (websocketConnection, connectionRequest) => {
      const [_path, params] = (connectionRequest?.url as string)?.split("?");
      const connectionParams = new URLSearchParams(params);
      console.log("CONNECTION PARAMS: ", connectionParams);
      const userName = connectionParams.get("userName");
      if (connectionParams.get("type") === "create") {
        const roomName = await createRoom(userName, websocketConnection);
        connectionParams.set("roomName", roomName);
        activeRooms[roomName] = {
          p1Data: {
            name: userName || "",
            conn: websocketConnection,
          },
          gameState: {
            gridState: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
            currentTurn: 1,
          },
        };
      } else {
        const roomName = connectionParams.get("roomName") || "";
        console.log("join room name: ", roomName);
        console.log("join user name: ", userName);
        handleJoinGame(userName, roomName);
        activeRooms[roomName] = {
          ...activeRooms[roomName],
          p2Data: {
            name: userName || "",
            conn: websocketConnection,
          },
        };

        activeRooms[roomName]?.p1Data?.conn.send(
          JSON.stringify({
            type: "player_joined",
            payload: {
              opponent: userName,
            },
          })
        );

        activeRooms[roomName]?.p2Data?.conn.send(
          JSON.stringify({
            type: "player_joined",
            payload: {
              opponent: activeRooms[roomName]?.p1Data?.name,
            },
          })
        );

        // Send Game start to both users
        activeRooms[roomName]?.p1Data?.conn.send(
          JSON.stringify({
            type: "game_start",
            payload: {
              state: activeRooms[roomName]?.gameState,
            },
          })
        );
        activeRooms[roomName]?.p2Data?.conn.send(
          JSON.stringify({
            type: "game_start",
            payload: {
              state: activeRooms[roomName]?.gameState,
            },
          })
        );
      }

      websocketConnection.on("message", (message: string) => {
        const roomName = connectionParams.get("roomName") || "";
        const parsedMessage = JSON.parse(message);
        const currentTurn =
          activeRooms[roomName].gameState.currentTurn === 1 ? 2 : 1;
        console.log(parsedMessage);
        if (parsedMessage?.type === "game_move") {
          const { newBoard, winner } = handlePlayMove(
            activeRooms[roomName]?.gameState?.gridState,
            parseInt(parsedMessage?.payload?.column),
            parseInt(parsedMessage?.payload?.player)
          );
          activeRooms[roomName].gameState = {
            gridState: newBoard,
            currentTurn: currentTurn,
          };

          activeRooms[roomName].p1Data?.conn.send(
            JSON.stringify({
              type: "game_move",
              payload: {
                board: newBoard,
                winner,
                currentTurn,
              },
            })
          );
          activeRooms[roomName].p2Data?.conn.send(
            JSON.stringify({
              type: "game_move",
              payload: {
                board: newBoard,
                winner,
                currentTurn,
              },
            })
          );
        }
      });

      websocketConnection.on("close", () => {
        handleClientDisconnect(
          connectionParams.get("userName"),
          connectionParams.get("roomName")
        );
        console.log(`Client ${connectionParams} disconnected`);
      });
    }
  );

  return websocketServer;
};
