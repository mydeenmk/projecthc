// // index.js
// const express = require('express');
// const twilio = require('twilio');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const bodyParser = require('body-parser');

// // Load environment variables from .env file
// dotenv.config();

const express = require('express');
const twilio = require('twilio');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors')


dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); 

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const otpSchema = new mongoose.Schema({
    phoneNumber: String,
    otp: String,
    timestamp: { type: Date, default: Date.now }
});

const OTP = mongoose.model('OTP', otpSchema);

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

app.post('/api/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    const otp = generateOTP();

    try {
        await OTP.create({ phoneNumber, otp });
    } catch (error) {
        console.error('Error storing OTP in MongoDB:', error);
        return res.status(500).json({ success: false, error: 'Failed to store OTP' });
    }

    client.messages.create({
        body: `Your OTP for login: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
    })
    .then(message => {
        console.log('OTP sent:', message.sid);
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    })
    .catch(err => {
        console.error('Error sending OTP:', err);
        res.status(500).json({ success: false, error: 'Failed to send OTP' });
    });
});

app.post('/api/verify-otp', async (req, res) => {
    const { otp, phoneNumber } = req.body;

    try {
        const storedOTP = await OTP.findOne({ phoneNumber }).sort({ timestamp: -1 }).exec();

        if (!storedOTP) {
            return res.status(400).json({ success: false, error: 'OTP not found. Please resend OTP.' });
        }

        const otpExpiryTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        if (Date.now() - storedOTP.timestamp > otpExpiryTime) {
            return res.status(400).json({ success: false, error: 'OTP expired. Please resend OTP.' });
        }

        console.log('Entered OTP:', otp);
        console.log('Stored OTP:', storedOTP.otp);
        if (otp === storedOTP.otp) {
            res.status(200).json({ success: true, message: 'OTP verified successfully' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, error: 'Failed to verify OTP' });
    }
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
