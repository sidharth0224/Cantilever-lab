import axios from 'axios';

// In dev, Vite proxy forwards /api → localhost:3001
// In production, set VITE_API_URL to your deployed backend URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 180000, // 3 min timeout for long AI generations
});

export async function sendMessage(query, duration) {
    const response = await api.post('/chat', { query, duration });
    return response.data;
}

export async function getTopics() {
    const response = await api.get('/topics');
    return response.data.topics;
}

export async function addTopic(name, description, subtopics) {
    const response = await api.post('/topics', { name, description, subtopics });
    return response.data.topic;
}

export default api;
