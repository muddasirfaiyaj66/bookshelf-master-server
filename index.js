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

        }catch (error) {
          res.status(500).send('An error occurred: ' + error.message);
        }
    });

    // post a book api

    app.post('/api/v1/add-book', async(req,res)=>{
      try{
        const data = req.body;
        const result = await booksCollection.insertOne(data);
        res.send(result);
        

      }
      catch (error) {
        res.status(500).send('An error occurred: ' + error.message);
      }
    }); 

    // get books api 
    //find category data ==> api/v1/all-book?category_name=History 
    // find data by quantity ==> api/v1/all-book?sortField=quantity&sortOrder=desc
    app.get('/api/v1/all-book', async(req,res)=>{
      try{
        let queryObj = {};
        let sortObj = {};
    
        const category = decodeURIComponent(req.query.category_name);
        const sortField = req.query.sortField;
        const sortOrder = req.query.sortOrder;
    
        if (category) {
          queryObj.category_name = category;
        }
    
        if (sortField && sortOrder) {
          sortObj[sortField] = sortOrder;
        }
    
        const cursor = booksCollection.find(queryObj).sort(sortObj);
        const result = await cursor.toArray();
    
        res.send(result);
      }catch (error) {
        res.status(500).send('An error occurred: ' + error.message);
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