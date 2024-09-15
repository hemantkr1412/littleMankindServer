const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose'); // Add mongoose
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log(err));

// Define User schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    panCard: { type: String, required: false },
    amount: { type: String, required: true },
    razorpay_order_id:{ type: String, required: true },
    razorpay_payment_id:{ type: String, required: true },
    razorpay_signature:{ type: String, required: true },
});

// Create a model from the schema
const Users = mongoose.model('Users', userSchema);

app.get('/', (req, res) => {
    res.send('Successful response.');
});

// Razorpay order creation API
app.post("/order", async (req, res) => {
    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET
        });

        if (!req.body) {
            return res.status(400).send("Bad Request");
        }

        const options = req.body;
        const order = await razorpay.orders.create(options);

        if (!order) {
            return res.status(400).send("Bad Request");
        }

        res.json(order);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

// Razorpay payment validation API
app.post("/validate", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature,name,email,phoneNumber,panCard,amount } = req.body;

    const sha = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest("hex");

    if (digest !== razorpay_signature) {
        return res.status(400).json({ msg: "Transaction is not legit!" });
    }

    if (!name || !phoneNumber || !amount) {
        return res.status(400).json({ msg: "All fields are required" });
    }

    const user = new Users({
        name,
        email,
        phoneNumber,
        panCard,
        amount,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature

    });

    await user.save();



    res.json({ msg: "Transaction is legit! We have save DB", orderId: razorpay_order_id, paymentId: razorpay_payment_id });
});


app.listen(5000, () => console.log('Example app is listening on port 5000.'));
