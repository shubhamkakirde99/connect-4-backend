import express, { Express, Request, Response } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import bodyParser from "body-parser";
import websockets from "./websockets";

var jsonParser = bodyParser.json();

const connectionString = `mongodb+srv://${process.env?.MONGO_USERNAME}:${process.env?.MONGO_PASSWORD}@cluster0.0tkabxq.mongodb.net/`;

let conn;
let db: any;

const app: Express = express();
app.use(cors());
const port = 3001;

const healthData = {
  dbConnected: false,
  websocketsConnected: false,
}

app.get("/health", async (req: Request, res: Response) => {
  res.send(healthData).status(200);
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


const client = new MongoClient(connectionString);
client.connect().then((connectionObject) => {
  try {
    db = connectionObject;
    healthData.dbConnected = true;
    console.info("[server] - Connected to the database");
  } catch (e) {
    console.error("[server] - Error connecting to database: ", e);
  }
});


try {
  const server = app.listen(port, () => {
    console.log(
        `[server]: Server is running`
    );
  });
  websockets(server, db);
  healthData.websocketsConnected = true;
} catch (e) {
  console.error("[server] - ERROR IS: ", e);
}
