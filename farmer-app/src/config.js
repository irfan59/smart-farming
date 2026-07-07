// Android emulator reaches the host machine at 10.0.2.2; override via env for real builds.
export const API_URL = process.env.API_URL || 'http://10.0.2.2:4000/api';
