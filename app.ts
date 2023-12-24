import express, { Express, Request, Response } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import bodyParser from "body-parser";
import websockets from "./websockets";
import dotenv from "dotenv";

const APP_CONFIG = dotenv.config().parsed;
console.log("config fetched: ", APP_CONFIG);

var jsonParser = bodyParser.json();

const connectionString = `mongodb+srv://${APP_CONFIG?.MONGO_USERNAME}:${APP_CONFIG?.MONGO_PASSWORD}@cluster0.0tkabxq.mongodb.net/`;

let conn;
let db: any;

const app: Express = express();
app.use(cors());
const port = 3001;

app.get("/", async (req: Request, res: Response) => {
  let collection = await db.collection("active_players");
  let results = await collection.find({}).limit(50).toArray();

  res.send(results).status(200);
});

app.get("/check-user/:userName", async (req: Request, res: Response) => {
  const userName = req.params.userName;
  let collection = await db.collection("active_players");
  let results = await collection.find({ userName }).limit(1).toArray();
  console.log("fetched data is: ", results);

  res.send(Boolean(results.length)).status(200);
});

app.get("/room-exists/:roomName", async (req: Request, res: Response) => {
  const roomName = req.params.roomName;
  let collection = await db.collection("active_games");
  let results = await collection.find({ roomName }).limit(1).toArray();
  console.log("fetched data is: ", results);

  res.send(Boolean(results.length)).status(200);
});

try {
  const client = new MongoClient(connectionString);
  client.connect().then((connectionObject) => {
    try {
      conn = connectionObject;
      db = conn.db("connect-x");
      const server = app.listen(port, () => {
        console.log(
          `⚡️[server]: Server is running at http://localhost:${port}`
        );
      });
      websockets(server, db);
    } catch (e) {
      console.error("ERROR IS: ", e);
    }
  });
} catch (e) {
  console.error("ERROR IS: ", e);
}
