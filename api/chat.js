// Vercel Serverless Function: POST /api/chat
// Runs the LangGraph agent pipeline (Supervisor → Researcher → Media Engine)

import { buildAgentGraph, createInitialState } from '../server/agents/graph.js';

let compiledGraph = null;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { query, duration } = req.body;

        if (!query || !query.trim()) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Build graph once and reuse (warm function)
        if (!compiledGraph) {
            compiledGraph = buildAgentGraph();
        }

        const initialState = createInitialState(query.trim(), duration || 3);
        const result = await compiledGraph.invoke(initialState);

        return res.status(200).json({
            query: result.query,
            topic: result.topic,
            duration: result.duration,
            rejected: result.rejected,
            rejectionReason: result.rejectionReason,
            classification: result.classification,
            markdown: result.markdown,
            imageUrl: result.imageUrl,
            audioText: result.audioText,
            mediaFailed: result.mediaFailed
        });

    } catch (error) {
        console.error('Chat API error:', error.message);
        return res.status(500).json({
            error: `AI processing failed: ${error.message}`,
            query: req.body?.query
        });
    }
}

export const config = {
    maxDuration: 60,
};
