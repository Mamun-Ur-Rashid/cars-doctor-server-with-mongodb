const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASS}@cluster0.sflyv9x.mongodb.net/?retryWrites=true&w=majority`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWt = (req, res, next) => {
  console.log('verify jwt', req.headers.authorization);
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'})
  }
  const token = authorization.split(' ')[1];
  console.log('authorized token', token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) =>{
    if(error){
      return res.status(403).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carsdoctor').collection('services');
    const bookingCollection = client.db('carsdoctor').collection('bookings');

    app.get('/services', async(req, res) => {
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    // app.get('/services/:id', async(req, res) => {
    //     const id = req.params.id;
    //     const query = { _id : new ObjectId(id)};
    //     const result = await serviceCollection.findOne(query);
    //     res.send(result);
    // })
    app.get('/services/:id', async(req, res) =>{
        const id = req.params.id;
        const query = { _id : new ObjectId(id)};
        const options = {
            
            // Include only the `title` and `imdb` fields in the returned document
            projection: { title: 1, price: 1, service_id:1, img:1, color:1 },
          };
        const result = await serviceCollection.findOne(query, options);
        res.send(result);
    })
    // booking data post
    app.post('/bookings', async (req, res) =>{
        const booking = req.body;
        console.log(booking);
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
    })
    // booking all data get / read
    app.get('/bookings', verifyJWt, async(req, res) => {
      // console.log(req.headers.authorization);
      const decoded = req.decoded;
      console.log(decoded);
      if(decoded.email !== req.query.email){
        return res.status(403).send({error: 1, message:'forbidden access'})
      }
      let query = {};
      if(req.query?.email){
        query = {email : req.query.email};
      }
      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    // booking data delete
    app.delete('/bookings/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })
    // booking data updated
    app.patch('/bookings/:id', async(req, res) =>{
      const id = req.params.id;
      const bookingUpdating = req.body;
      console.log(bookingUpdating);
      const filter = { _id: new ObjectId(id)};
      const updateddoc ={
        $set: {
          status: bookingUpdating.status
        }
      }
      const result = await bookingCollection.updateOne(filter, updateddoc);
      res.send(result);
    })
    // JWT
    // console.log(process.env.ACCESS_TOKEN_SECRET);
    app.post('/jwt', (req, res) =>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '10h'})
        console.log("jwt server",token)
      res.send({token});
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Cars doctor server is running ");
})

app.listen(port, (req, res) => {
    console.log(`Cars doctor server running port is:${port}`);
});