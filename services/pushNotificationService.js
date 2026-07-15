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
let firebaseProjectId = null;

function serviceAccountFromEnv() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return JSON.parse(json);
  }

  return null;
}

function initializeFirebaseAdmin() {
  if (initialized || unavailableReason) return initialized;

  try {
    if (getApps().length > 0) {
      initialized = true;
      return true;
    }

    const serviceAccount = serviceAccountFromEnv();
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
      firebaseProjectId = serviceAccount.project_id || null;
      if (firebaseProjectId) {
        console.log(`Firebase Admin initialized for project ${firebaseProjectId}`);
      }
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
      'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT_JSON on Render.';
    console.warn(unavailableReason);
    return false;
  } catch (error) {
    unavailableReason = `Firebase Admin init failed: ${error.message}`;
    console.error(unavailableReason);
    return false;
  }
}

function androidChannelFor(type) {
  switch (type) {
    case 'live':
      return 'live_updates';
    case 'video':
      return 'video_updates';
    case 'audio':
      return 'audio_updates';
    case 'prayer':
      return 'prayer_updates';
    default:
      return 'daily_prayer';
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

  const cleanTokens = [...new Set(tokens.filter(Boolean))];
  if (cleanTokens.length === 0) return;

  const message = {
    tokens: cleanTokens,
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
        channelId: androidChannelFor(notification.type),
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
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/mismatched-credential' ||
        code === 'messaging/sender-id-mismatch'
      ) {
        invalidTokens.push(cleanTokens[index]);
      }
      console.error('FCM send error:', code || result.error?.message);
    }
  });

  await PushDeviceToken.deactivate(invalidTokens);
  if (invalidTokens.length > 0) {
    console.warn(`Deactivated ${invalidTokens.length} invalid FCM token(s).`);
  }
  console.log(
    `Push sent for notification ${notification.id || notification.type}: ` +
      `${response.successCount} success, ${response.failureCount} failed, ` +
      `${cleanTokens.length} target(s).`,
  );
}

module.exports = {
  sendPushToAll,
  sendPushToAdmins,
};
