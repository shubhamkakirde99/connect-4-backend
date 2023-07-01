import express, { Express, Request, Response } from "express";
import { MongoClient } from "mongodb";
import connDetails from "./database_config";
import cors from "cors";

const connectionString = `mongodb+srv://${connDetails.userName}:${connDetails.password}@cluster0.0tkabxq.mongodb.net/`;

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

  res.send(Boolean(results.length)).status(200);
});

try {
  const client = new MongoClient(connectionString);
  client.connect().then((connectionObject) => {
    try {
      conn = connectionObject;
      db = conn.db("connect-x");
      app.listen(port, () => {
        console.log(
          `⚡️[server]: Server is running at http://localhost:${port}`
        );
      });
    } catch (e) {
      console.error("ERROR IS: ", e);
    }
  });
} catch (e) {
  console.error("ERROR IS: ", e);
}
