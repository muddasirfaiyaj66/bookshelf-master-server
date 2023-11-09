const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const cors = require('cors');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin:['http://localhost:5173','https://bookshelf-master.web.app', 'https://bookshelf-master.firebaseapp.com'],
    
    
    credentials: true
}))

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rrl4awm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middleware 

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
      return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
      }
      req.user = decoded;
      next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
   client.connect();



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

const booksCategoryCollections = client.db('bookshelfMasterDB').collection('categories');
const booksCollection = client.db('bookshelfMasterDB').collection('books');
const borrowedBookCollection = client.db('bookshelfMasterDB').collection('borrowedBook');
const usersCollections = client.db('bookshelfMasterDB').collection('users');


// auth related api
app.post('/api/v1/jwt',  async (req, res) => {
  const user = req.body;
  // console.log('user for token', user);
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

  res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
  })
      .send({ success: true });
})

app.post('/api/v1/logout', async (req, res) => {
  const user = req.body;
  // console.log('logging out', user);
  res.clearCookie('token', { maxAge: 0 }).send({ success: true })
})
 //Auth related api  end    

//get home page card data from this api
app.get('/api/v1/categories', async (req, res) => {
  try {
    const result = await booksCategoryCollections.find().toArray();
    res.send(result)

  } catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
});

app.post('/api/v1/user', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const result = await usersCollections.insertOne(data);
    res.send(result);


  }
  catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
});
app.get('/api/v1/user',verifyToken, async (req, res) => {
  try {
    const result = await usersCollections.find().toArray();
    res.send(result)

  } catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
});

// post a book api
app.post('/api/v1/add-book', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const result = await booksCollection.insertOne(data);
    res.send(result);


  }
  catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
});

app.get('/api/v1/all-book/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const result = await booksCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)

  } catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
});
// get books api 
//find category data ==> api/v1/all-book?category_name=History 
// find data by quantity ==> api/v1/all-book?sortField=quantity&sortOrder=desc
app.get('/api/v1/all-book', async (req, res) => {
  try {
    let queryObj = {};
    let sortObj = {};

    const category = decodeURIComponent(req.query.category_name);

    const sortField = req.query.sortField;
    const sortOrder = req.query.sortOrder;


    if (category && req.query.category_name) {
      queryObj.category_name = category;
    }

    if (sortField && sortOrder) {
      sortObj[sortField] = sortOrder;
    }

    const cursor = booksCollection.find(queryObj).sort(sortObj)
    const result = await cursor.toArray()

    res.send(result);
  } catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
})

app.delete('/api/v1/all-book/:id', async(req,res)=>{
  try{
    const id=req.params.id;
    const query = {_id: new ObjectId(id)};
    const result =await booksCollection.deleteOne(query)
    res.send(result)
   

  }catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
});
//update
app.put('/api/v1/all-book/:id', async (req, res) => {
  try {
    const id = {_id:new ObjectId(req.params.id)};
    const body = req.body;
    
  
    const UpdatedBook = {
      $set: {
       ...body,

      },

    };
    const option ={upsert:true};
    const result = await booksCollection.updateOne(id, UpdatedBook,option);

   res.send(result);
  } catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }

});

app.post('/api/v1/borrowed-book', async (req, res) => {
  try {
    const data = req.body;

    const result = await borrowedBookCollection.insertOne(data);
    res.send(result);
  } catch (error) {
    console.error('Error adding borrowed book:', error);
    res.status(500).json({ error: 'An error occurred while adding the borrowed book.' });
  }
});




app.get('/api/v1/borrowed-book',verifyToken, async(req,res)=>{
  try {
    
    

    if(req.query.email !== req.user.email){
      return res.status(403).send({message: 'forbidden access'})
  }
    let book ={};
    let query = {};
    if (req.query?.email) {
      query = { userEmail: req.query.email }
      
    }
    if(req.query?.bookId){
      book ={ bookId: req.query.bookId}
    }
    // console.log(req.cookies.token);
    const cursor = borrowedBookCollection.find(query);
    const result = await cursor.toArray();
    const result2 = await  borrowedBookCollection.find(book).toArray();

    res.send({result,result2});

}catch (error) {
  res.status(500).send('An error occurred: ' + error.message);
}

})
app.get('/api/v1/borrowed-book/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const result = await borrowedBookCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)

  } catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
});
app.delete('/api/v1/borrowed-book/:id', async(req,res)=>{
  try{
    const id=req.params.id;
    const query = {_id: new ObjectId(id)};
    const result =await borrowedBookCollection.deleteOne(query)
    res.send(result)
   

  }catch (error) {
    res.status(500).send('An error occurred: ' + error.message);
  }
});




app.get('/', (req, res) => {
  res.send({ message: 'Hello World' });
})
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
})