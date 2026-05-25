const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Load Firebase credentials
const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Map to store tokens linked to User IDs
// key: userId, value: fcmToken
let userRegistry = new Map();

// Endpoint for the Android app to link a user to their device token
app.post('/register-token', (req, res) => {
    const { token, userId } = req.body;

    if (!token) return res.status(400).send({ error: 'Token is required' });

    // Use provided userId or fallback to 'anonymous'
    const id = userId || 'anonymous';

    userRegistry.set(id, token);

    console.log(`[Registry] User "${id}" registered.`);
    res.status(200).send({ message: `Successfully registered ${id}` });
});

// Endpoint to send notification
app.post('/send-notification', (req, res) => {
    const { title, body, userId } = req.body;

    let targets = [];

    if (userId) {
        const token = userRegistry.get(userId);
        if (!token) {
            console.log(`[Sender] User "${userId}" not found. Registry has:`, Array.from(userRegistry.keys()));
            return res.status(404).send({ error: `User "${userId}" not found` });
        }
        targets.push(token);
    } else {
        targets = Array.from(userRegistry.values());
    }

    if (targets.length === 0) {
        return res.status(400).send({ error: 'No active devices registered' });
    }

    const message = {
        notification: {
            title: title || 'Alert',
            body: body || 'New message from Dwelco'
        },
        android: {
            notification: {
                channelId: 'dwelco_notifications_v2',
                priority: 'high'
            }
        },
        tokens: targets
    };

    admin.messaging().sendEachForMulticast(message)
        .then((response) => {
            console.log(`[Sender] Sent to ${response.successCount} devices. Failures: ${response.failureCount}`);
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
    console.log(`Ready for registrations...`);
});
