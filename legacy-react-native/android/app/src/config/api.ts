
const DEV_API_URL = 'http://10.0.2.2:5000/api'; // For Android Emulator
const PROD_API_URL = 'https://your-production-api.com/api';

export const API_CONFIG = {
  BASE_URL: __DEV__ ? DEV_API_URL : PROD_API_URL,
  WS_URL: __DEV__ ? 'ws://10.0.2.2:5000' : 'wss://your-production-api.com',
  TIMEOUT: 10000,
};