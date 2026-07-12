const {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const PushDeviceToken = require('../models/PushDeviceToken');

let initialized = false;
let unavailableReason = null;

function initializeFirebaseAdmin() {
  if (initialized || unavailableReason) return initialized;

  try {
    if (getApps().length > 0) {
      initialized = true;
      return true;
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountJson)),
      });
      initialized = true;
      return true;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        credential: applicationDefault(),
      });
      initialized = true;
      return true;
    }

    unavailableReason =
      'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON on Render.';
    console.warn(unavailableReason);
    return false;
  } catch (error) {
    unavailableReason = `Firebase Admin init failed: ${error.message}`;
    console.error(unavailableReason);
    return false;
  }
}

async function sendPushToAll(notification) {
  if (!notification || !initializeFirebaseAdmin()) return;

  const tokens = await PushDeviceToken.findActiveTokens();
  await sendPushToTokens(tokens, notification);
}

async function sendPushToAdmins(notification) {
  if (!notification || !initializeFirebaseAdmin()) return;

  const tokens = await PushDeviceToken.findActiveAdminTokens();
  await sendPushToTokens(tokens, notification);
}

async function sendPushToTokens(tokens, notification) {
  if (tokens.length === 0) return;

  const message = {
    tokens,
    notification: {
      title: notification.title || 'AmkaTuombe TV',
      body: notification.body || '',
    },
    data: {
      notificationId: String(notification.id || ''),
      type: String(notification.type || ''),
      mediaId: String(notification.media_id || ''),
      url: String(notification.url || ''),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: `${notification.type || 'general'}_updates`,
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  const response = await getMessaging().sendEachForMulticast(message);
  const invalidTokens = [];
  response.responses.forEach((result, index) => {
    if (!result.success) {
      const code = result.error?.code || '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(tokens[index]);
      }
      console.error('FCM send error:', code || result.error?.message);
    }
  });

  await PushDeviceToken.deactivate(invalidTokens);
}

module.exports = {
  sendPushToAll,
  sendPushToAdmins,
};
