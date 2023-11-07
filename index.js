const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();

const port =process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rrl4awm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
     client.connect();
    const booksCategoryCollections = client.db('bookshelfMasterDB').collection('categories');
    const booksCollection = client.db('bookshelfMasterDB').collection('books');

    //get home page card data from this api
    app.get('/api/v1/categories', async(req,res)=>{
        try{
            const result = await booksCategoryCollections.find().toArray();
            res.send(result)

        }catch{
            res.send(Error)
        }
    });

    // post a book api

    app.post('/api/v1/add-book', async(req,res)=>{
      try{
        const data = req.body;
        const result = await booksCollection.insertOne(data);
        res.send(result);
        

      }
      catch{
        res.send(Error)
      }
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send({message: 'Hello World'});
})
app.listen(port, ()=>{
    console.log(`Server is running on ${port}`);
})