const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// 1. PLACE YOUR FIREBASE SERVICE ACCOUNT PRIVATE KEY (.json file) IN THIS FOLDER
// AND UPDATE THE FILENAME BELOW.
const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// In-memory "database" for tokens (In production, use a real DB like MongoDB or Firestore)
let registeredTokens = new Set();

// Endpoint for the Android app to register its unique token
app.post('/register-token', (req, res) => {
    const { token } = req.body;
    if (token) {
        registeredTokens.add(token);
        console.log(`Token registered: ${token}`);
        res.status(200).send({ message: 'Token registered successfully' });
    } else {
        res.status(400).send({ error: 'Token is required' });
    }
});

// Endpoint to trigger a push notification to all registered devices
app.post('/send-notification', (req, res) => {
    const { title, body } = req.body;

    if (registeredTokens.size === 0) {
        return res.status(400).send({ error: 'No devices registered' });
    }

    const message = {
        notification: {
            title: title || 'Hello!',
            body: body || 'This is a test notification from Dwelco Server'
        },
        android: {
            notification: {
                channelId: 'dwelco_notifications_v2', // Match the ID in Android code
                priority: 'high'
            }
        },
        // Send to all tokens (converted back to array)
        tokens: Array.from(registeredTokens)
    };

    admin.messaging().sendEachForMulticast(message)
        .then((response) => {
            console.log(`Successfully sent ${response.successCount} messages`);
            res.status(200).send({
                success: true,
                sentCount: response.successCount,
                failureCount: response.failureCount
            });
        })
        .catch((error) => {
            console.error('Error sending message:', error);
            res.status(500).send({ error: 'Failed to send notifications' });
        });
});

app.listen(port, () => {
    console.log(`Dwelco Web Server running at http://localhost:${port}`);
    console.log(`Waiting for FCM tokens...`);
});
