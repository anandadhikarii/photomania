const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. Database Connection & Schema ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB connection error:", err));

const registrationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  college: { type: String, required: true },
  year: { type: String, required: true },
  branch: { type: String, required: true },
  eventCat: { type: Number, required: true },
  utrNumber: { type: String, required: true, unique: true },
  screenshotUrl: { type: String, required: true },
  status: { type: String, default: 'pending' }, 
  ticketId: { type: String, default: null }
}, { timestamps: true });

const Registration = mongoose.model('Registration', registrationSchema);

// --- 2. Admin Login Route ---
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASS) {
    res.status(200).json({ success: true, token: "auth_token_granted" });
  } else {
    res.status(401).json({ success: false, message: "Invalid Password" });
  }
});

// --- 3. Registration Route ---
app.post('/api/register', async (req, res) => {
  try {
    const existingUtr = await Registration.findOne({ utrNumber: req.body.utrNumber });
    if (existingUtr) return res.status(400).json({ message: "UTR already submitted." });

    const newRegistration = new Registration(req.body);
    await newRegistration.save();
    res.status(201).json({ message: "Registration successful." });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration." });
  }
});

// --- 4. Admin Dashboard Routes ---
app.get('/api/admin/pending', async (req, res) => {
  try {
    const pending = await Registration.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.status(200).json(pending);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch data." });
  }
});

app.get('/api/admin/scanned', async (req, res) => {
  try {
    const scanned = await Registration.find({ status: 'checked-in' }).sort({ updatedAt: -1 });
    res.status(200).json(scanned);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch scanned attendees." });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const all = await Registration.find();
    const totalRegistrations = all.length;
    const pending = all.filter(r => r.status === 'pending').length;
    const approved = all.filter(r => r.status === 'approved' || r.status === 'checked-in');
    const checkedIn = all.filter(r => r.status === 'checked-in').length;
    const totalFunds = approved.reduce((sum, user) => sum + user.eventCat, 0);

    res.status(200).json({ totalRegistrations, pending, approved: approved.length, checkedIn, totalFunds });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stats." });
  }
});

app.get('/api/admin/export', async (req, res) => {
  try {
    const users = await Registration.find().sort({ createdAt: -1 });
    let csv = 'Name,Phone,Email,College,Year,Branch,Package,UTR,Status,Ticket ID,Date\n';
    
    users.forEach(u => {
      csv += `"${u.fullName}","=""${u.phone}""","${u.email}","${u.college}","${u.year}","${u.branch}","₹${u.eventCat}","=""${u.utrNumber}""","${u.status}","${u.ticketId || 'Pending'}","${u.createdAt.toLocaleDateString()}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('PhotoMania_Registrations.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Export failed." });
  }
});

// --- 5. Ticket Approval & Emailing ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.post('/api/admin/approve/:id', async (req, res) => {
  try {
    const user = await Registration.findById(req.params.id);
    if (!user || user.status !== 'pending') return res.status(400).json({ message: "Invalid request." });

    const ticketId = 'PM26-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const qrCodeDataURI = await QRCode.toDataURL(`https://photomania.com/verify/${ticketId}`);
    const base64Data = qrCodeDataURI.split(',')[1];

    const mailOptions = {
      from: `"Photo Mania 2026" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your Photo Mania 2026 Ticket!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111; color: #fff; padding: 30px; border-radius: 15px;">
            <h1 style="color: #d4af37; text-align: center;">Ticket Confirmed!</h1>
            <p>Hi <b>${user.fullName}</b>,</p>
            <p>Your payment of ₹${user.eventCat} is verified.</p>
            <div style="background-color: #222; padding: 20px; border-radius: 10px; text-align: center;">
                <h2 style="color: #fff;">ID: <span style="color: #d4af37;">${ticketId}</span></h2>
                <img src="cid:ticketqr" alt="QR Ticket" style="width: 200px; height: 200px; border: 4px solid #fff; border-radius: 10px; margin-top: 15px;" />
            </div>
        </div>
      `,
      attachments: [{
        filename: 'qr-ticket.png',
        content: base64Data,
        encoding: 'base64',
        cid: 'ticketqr'
      }]
    };

    await transporter.sendMail(mailOptions);

    user.status = 'approved';
    user.ticketId = ticketId;
    await user.save();

    res.status(200).json({ message: "Ticket emailed successfully!" });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ message: "Failed to approve and send email." });
  }
});

// --- 6. Gate Scanner Endpoint ---
app.post('/api/verify/:ticketId', async (req, res) => {
  try {
    const user = await Registration.findOne({ ticketId: req.params.ticketId });
    if (!user) return res.status(404).json({ success: false, message: "INVALID TICKET" });

    const userDetails = { 
        name: user.fullName, phone: user.phone, email: user.email, 
        college: user.college, branch: user.branch, year: user.year, 
        package: user.eventCat, ticketId: user.ticketId 
    };

    if (user.status === 'checked-in') {
      return res.status(400).json({ success: false, message: "ALREADY CHECKED IN", user: userDetails });
    }

    if (user.status === 'approved') {
      user.status = 'checked-in';
      await user.save();
      return res.status(200).json({ success: true, message: "ACCESS GRANTED", user: userDetails });
    }

    res.status(400).json({ success: false, message: "Ticket pending approval." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Scanner error." });
  }
});

module.exports = app;
app.listen(process.env.PORT || 5000, () => console.log(`Server running on port ${process.env.PORT || 5000}!`));