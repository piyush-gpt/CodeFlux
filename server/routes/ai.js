const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { logger } = require('../utils/logger');

if (!process.env.GEMINI_API_KEY) {
  logger.error('GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
const config = {
    responseMimeType: 'text/plain',
  };

const formatPrompt = (prompt, fileContent, filePath, language) => {
  return `You are a helpful programming assistant. The user is working on a file,
Current file content:
\`\`\`
${fileContent}
\`\`\`

User request: ${prompt}

Please provide a helpful response. If you suggest code changes, wrap them in \`\`\`${language} ... \`\`\` blocks.
If you're explaining code, be clear and concise. If you're fixing bugs, explain what was wrong and how you fixed it.`;
};

router.post('/assist', async (req, res) => {
  try {
    const { prompt, fileContent, filePath, language } = req.body;
    
    // Set up streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Generate streaming content
    const result = await genAI.models.generateContentStream({
      model: "gemini-2.0-flash",
      config: config,
      contents: formatPrompt(prompt, fileContent, filePath, language)
    });
    
    // Stream the response chunks
    for await (const chunk of result) {
      res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }

    res.end();
  } catch (error) {
    logger.error('AI API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI request'
    });
  }
});

router.post('/complete', async (req, res) => {
  try {
    const { fileContent, filePath, language, cursorPosition, prompt } = req.body;
    
    const completionPrompt = `You are a code completion assistant. Your task is to complete the code based on the user's requirements.

User's requirements: ${prompt}
    
Current file content:
\`\`\`
${fileContent}
\`\`\`

CRITICAL INSTRUCTIONS:
1. Return ONLY the completed whole code on the user's requirements, act as an code completion assistant and  DO NOT add any language identifiers (no jsx, no css, no javascript, etc.) at the beginning.
2. DO NOT add any language identifiers (no jsx, no css, no javascript,  no python etc.) in the beginning or end of the code
3. DO NOT add any markdown formatting or backticks
4. DO NOT add any explanations or comments
5. Just return the raw completed code exactly as it should appear in the file
6. Start the code with \`\`\` and end with \`\`\` and DO NOT add any language identifiers (no jsx, no css, no javascript, no python, etc.) in the beginning or end of the code

`;
    
   
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    
    const result = await genAI.models.generateContentStream({
      model: "gemini-2.0-flash",
      config: config,
      contents: completionPrompt
    });
    
    // Stream the response chunks
    for await (const chunk of result) {
      res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }
    
    res.end();
  } catch (error) {
    logger.error('AI API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process completion request'
    });
  }
});

router.post('/explain', async (req, res) => {
  try {
    const { fileContent, filePath, language, selectedCode } = req.body;
    
    
    const prompt = `Explain the following code from ${filePath} (${language}):
\`\`\`${language}
${selectedCode}
\`\`\`
Provide a clear and concise explanation.`;
    
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

 
    const result = await genAI.models.generateContentStream({
        model: "gemini-2.0-flash",
        config: config,
      contents: prompt
    });
    
    // Stream the response chunks
    for await (const chunk of result) {
      res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }
    
    res.end();
  } catch (error) {
    logger.error('AI API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process explanation request'
    });
  }
});

module.exports = router; 