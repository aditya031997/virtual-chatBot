import axios from 'axios';
import { API_CONFIG } from '@/utils/api/apiConfig';

const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
});

export default apiClient;
