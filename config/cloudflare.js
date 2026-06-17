// config/cloudflare.js
const axios = require('axios');

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

const cfApi = axios.create({
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}`,
  headers: {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
});

module.exports = { cfApi, accountId };