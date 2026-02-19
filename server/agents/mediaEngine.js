// ─── Media Engine Agent (Node C) ── Image & Audio Generator ───
// Generates an illustrative SVG image and prepares a clean TTS script
// using Groq for text processing. Handles failures gracefully.

import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function runMediaEngine(state) {
    // If rejected or no markdown content, skip media generation
    if (state.rejected || !state.markdown) return state;

    let imageUrl = null;
    let audioText = null;
    let mediaFailed = false;

    // ─── Image Generation: Create a topic SVG ───
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: `Create a brief, descriptive prompt (1-2 sentences) for an educational diagram or illustration about: "${state.topic}". 
The prompt should describe a clean, professional infographic that would help students understand this topic for placement interviews.
Return ONLY the image description, nothing else.`
                }
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        const imageDescription = completion.choices[0]?.message?.content?.trim() || state.topic;

        // Generate topic SVG with the description
        const svgContent = generateTopicSVG(state.topic, imageDescription);
        const imageFileName = `topic-${Date.now()}.svg`;
        const imagePath = path.join(publicDir, imageFileName);
        fs.writeFileSync(imagePath, svgContent);
        imageUrl = `/public/${imageFileName}`;

    } catch (error) {
        console.error("Image generation error:", error.message);
        mediaFailed = true;
    }

    // ─── Audio: Prepare text for browser-side TTS ───
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: `Convert the following markdown content into a clean, natural-sounding script for text-to-speech narration. 
Remove all markdown formatting, code blocks, and special characters. 
Keep it conversational and clear. Limit to ${state.duration || 3} minutes of speech (~${(state.duration || 3) * 150} words).

Content:
${state.markdown.substring(0, 3000)}`
                }
            ],
            max_tokens: 1500,
            temperature: 0.5,
        });

        audioText = completion.choices[0]?.message?.content?.trim() || null;

    } catch (error) {
        console.error("Audio script generation error:", error.message);
        mediaFailed = true;
    }

    return {
        ...state,
        imageUrl,
        audioText,
        mediaFailed
    };
}

function generateTopicSVG(topic, description) {
    const safeTitle = escapeXml(topic || "Topic");
    const safeDesc = escapeXml((description || "").substring(0, 120));

    // Split description into lines of ~40 chars
    const words = safeDesc.split(" ");
    let lines = [];
    let currentLine = "";
    for (const word of words) {
        if ((currentLine + " " + word).length > 45) {
            lines.push(currentLine.trim());
            currentLine = word;
        } else {
            currentLine += " " + word;
        }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    lines = lines.slice(0, 4);

    const descTspans = lines
        .map((line, i) => `<tspan x="250" dy="${i === 0 ? 0 : 22}">${line}</tspan>`)
        .join("\n      ");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.15)" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.05)" />
    </linearGradient>
  </defs>
  <rect width="500" height="300" rx="16" fill="url(#bg)" />
  <rect x="24" y="24" width="452" height="252" rx="12" fill="url(#card)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
  <text x="250" y="80" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="700" fill="white">
    📚 ${safeTitle}
  </text>
  <line x1="100" y1="105" x2="400" y2="105" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
  <text x="250" y="145" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.85)">
      ${descTspans}
  </text>
  <text x="250" y="260" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="11" fill="rgba(255,255,255,0.5)">
    AI Tutor • Placement Preparation
  </text>
</svg>`;
}

function escapeXml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
