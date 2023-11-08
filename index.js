const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5020;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.082e3cj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middlewares
const logger = (req, res, next) => {
  // console.log("log info", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log("token in the middleWare", token);
  // no token available
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const blogCollection = client.db("blogDB").collection("blog");

    const blogUserCommentCollection = client.db("blogDB").collection("comment");

    const userCollection = client.db("blogDB").collection("user");

    const userCollectionData = client.db("blogDB").collection("userData");

    //auth related api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      // console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // user logged Out
    app.post("/logout", async (req, res) => {
      const user = req.body;
      // console.log("logging Out User", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //
    // blog user Comment Data
    app.post("/comments", async (req, res) => {
      const blogComment = req.body;
      const result = await blogUserCommentCollection.insertOne(blogComment);
      res.send(result);
    });

    // comment data paowar jonno
    app.get("/comments", async (req, res) => {
      const cursor = blogUserCommentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // blog data
    app.post("/blogs", async (req, res) => {
      const blogName = req.body;
      const result = await blogCollection.insertOne(blogName);
      res.send(result);
    });

    // data paowar jonno
    app.get("/blogs", async (req, res) => {
      const cursor = blogCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // details
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      // console.log(result);
      res.send(result);
    });
    
    //update
    app.put("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateData = req.body;
      const options = { upsert: true };
      const product = {
        $set: {
          title: updateData.title,
          image: updateData.image,
          category: updateData.category,
          full: updateData.full,
          description: updateData.description,
        },
      };
      const result = await blogCollection.updateOne(filter, product, options);
      res.send(result);
    });

    //user related api
    app.post("/user", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // user dataCollection
    app.post("/userData", async (req, res) => {
      const user = req.body;
      const result = await userCollectionData.insertOne(user);
      res.send(result);
    });

    // user data added
    app.get("/userData/:email", logger, verifyToken, async (req, res) => {
      // console.log("token owner info", req.user);
      if (req.user.email !== req.params.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const email = req.params.email;
      const result = await userCollectionData.find({ email: email }).toArray();
      res.send(result);
    });

    // user data deleted
    app.delete("/userData/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollectionData.deleteOne(query);
      res.send(result);
    });

    //
    // details 2
    app.get("/userData/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollectionData.findOne(query);
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Blog making server is running");
});

app.listen(port, () => {
  console.log(`Blog server is running PORT: ${port}`);
});
