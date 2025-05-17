require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs').promises; // Using promises for async file operations
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const HISTORY_FILE_PATH = path.join(__dirname, 'chat_history.json');

if (!DASHSCOPE_API_KEY) {
    console.error('Error: DASHSCOPE_API_KEY is not set in the .env file.');
    process.exit(1);
}

// Helper function to load history
async function loadHistory() {
    try {
        await fs.access(HISTORY_FILE_PATH);
        const data = await fs.readFile(HISTORY_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or other error, return empty array (or initialize structure)
        console.log('Chat history file not found or error reading, initializing new history.');
        return []; // Store history as an array of conversation objects
    }
}

// Helper function to save history
async function saveHistory(history) {
    try {
        await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(history, null, 2));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Middleware
app.use(cors({ origin: 'http://localhost:3000' })); // Allow requests from frontend on port 3000
app.use(express.json()); // To parse JSON request bodies

app.post('/api/chat', async (req, res) => {
    let { message, scenario, conversationId } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const history = await loadHistory();
    let currentConversation;
    let isNewConversation = false;

    if (conversationId) {
        currentConversation = history.find(conv => conv.id === conversationId);
        if (!currentConversation) {
            // Safety: if ID provided but not found, treat as new to avoid errors
            console.warn(`Conversation ID ${conversationId} not found. Starting new conversation.`);
            conversationId = null; // Fallthrough to new conversation logic
        }
    }

    if (!conversationId) {
        conversationId = uuidv4();
        currentConversation = {
            id: conversationId,
            title: message.substring(0, 30) + (message.length > 30 ? '...' : ''), // Use first part of message as title
            messages: [],
            scenario: scenario || 'general',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        history.unshift(currentConversation); // Add to the beginning of the array
        isNewConversation = true;
    } else {
        currentConversation.lastUpdated = new Date().toISOString();
    }

    currentConversation.messages.push({ sender: 'user', text: message, type: 'text', timestamp: new Date().toISOString() });

    const dashscopeApiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    let systemContent = "You are a helpful assistant.";
    // Use scenario from conversation if available, otherwise from request, then default
    const activeScenario = currentConversation.scenario || scenario || 'general'; 
    if (activeScenario === 'code') {
        systemContent = "You are a coding assistant.";
    } else if (activeScenario === 'creative') {
        systemContent = "You are a creative writing assistant.";
    }
    // Add more scenario-based system prompts as needed

    const requestBody = {
        model: 'qwen-turbo',
        input: {
            // Construct messages for API, potentially including some history for context
            // For simplicity now, just sending current user message and system prompt
            // For better context, you might want to include last few messages from currentConversation.messages
            messages: [
                { role: "system", content: systemContent },
                ...currentConversation.messages.slice(-10).map(msg => ({ // Send last 5 pairs (10 messages)
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                }))
                // { role: "user", content: message } // This is already included in the slice above if it's the last one
            ]
        },
        parameters: {}
    };

    try {
        const response = await fetch(dashscopeApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error('DashScope API Error:', errorData);
            // Remove user message if AI fails, or handle differently
            currentConversation.messages.pop(); 
            if(isNewConversation) history.shift(); // Remove conversation if it was new and failed
            await saveHistory(history);
            return res.status(response.status).json({ error: `DashScope API error: ${errorData.message || 'Unknown error'}` });
        }

        const data = await response.json();
        const replyText = data.output && data.output.text ? data.output.text : (data.output && data.output.choices ? data.output.choices[0].message.content : 'No reply text found');
        
        if (replyText === 'No reply text found') {
            console.warn('DashScope response structure might have changed or an issue occurred:', data);
        }
        currentConversation.messages.push({ sender: 'ai', text: replyText, type: 'text', timestamp: new Date().toISOString() });
        currentConversation.lastUpdated = new Date().toISOString(); // Ensure lastUpdated is set after AI reply
        
        // If it was a new conversation, ensure it's at the top.
        // If existing, move it to the top after update for better UX in history list.
        const updatedHistory = history.filter(c => c.id !== conversationId);
        updatedHistory.unshift(currentConversation);

        await saveHistory(updatedHistory);
        res.json({ reply: replyText, conversationId: currentConversation.id });

    } catch (error) {
        console.error('Error calling DashScope API:', error);
        // Rollback message addition on error
        currentConversation.messages.pop();
        if(isNewConversation) history.shift(); // Also remove conversation if new
        await saveHistory(history); // Save rolled-back history
        res.status(500).json({ error: 'Internal server error' });
    }
});

// New endpoint for Image Generation (Text-to-Image)
app.post('/api/image/generate', async (req, res) => {
    let { prompt, negative_prompt = "", conversationId, scenario } = req.body; // Make conversationId let

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for image generation' });
    }
    if (!DASHSCOPE_API_KEY) {
        return res.status(500).json({ error: 'Server API key not configured' });
    }

    const history = await loadHistory();
    let currentConversation;
    let isNewConversation = false;
    const imageScenario = 'aipainting'; // Fixed scenario for image generation

    if (conversationId) {
        currentConversation = history.find(conv => conv.id === conversationId);
        if (!currentConversation) {
            console.warn(`Conversation ID ${conversationId} not found for image generation. Starting new conversation.`);
            conversationId = null; 
        } else if (currentConversation.scenario !== imageScenario) {
            // If an existing conversation is used, but it's not an image scenario,
            // it's better to start a new one for clarity, or decide on a merge strategy.
            // For now, let's log and continue with the given ID, but ensure new messages reflect the image task.
            console.warn(`Continuing conversation ${conversationId} with image generation, though its original scenario was ${currentConversation.scenario}.`);
            currentConversation.scenario = imageScenario; // Update scenario if continuing
        }
    }

    if (!conversationId) {
        conversationId = uuidv4();
        currentConversation = {
            id: conversationId,
            title: prompt.substring(0, 25) + (prompt.length > 25 ? '... (AI Painting)' : ' (AI Painting)'),
            messages: [],
            scenario: imageScenario,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        history.unshift(currentConversation);
        isNewConversation = true;
    } else {
        currentConversation.lastUpdated = new Date().toISOString();
    }

    // Add user's prompt to history
    currentConversation.messages.push({ 
        sender: 'user', 
        text: prompt, // Store the prompt
        type: 'text', // Explicitly mark as text
        timestamp: new Date().toISOString() 
    });

    const imageSynthesisUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
    const taskQueryBaseUrl = 'https://dashscope.aliyuncs.com/api/v1/tasks/';

    const synthesisRequestBody = {
        model: "wanx2.1-t2i-turbo", // Model for text-to-image
        input: {
            prompt: prompt,
            negative_prompt: negative_prompt
        },
        parameters: {
            size: "1024*1024", // Default size, can be made configurable
            n: 1 // Generate 1 image
        }
    };

    try {
        console.log('Requesting image synthesis with prompt:', prompt);
        const synthesisResponse = await fetch(imageSynthesisUrl, {
            method: 'POST',
            headers: {
                'X-DashScope-Async': 'enable', // Important for async task
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(synthesisRequestBody)
        });

        if (!synthesisResponse.ok) {
            const errorData = await synthesisResponse.json().catch(() => ({ message: synthesisResponse.statusText }));
            console.error('DashScope Image Synthesis API Error:', errorData);
            return res.status(synthesisResponse.status).json({ error: `Image Synthesis API error: ${errorData.message || 'Unknown error'}` });
        }

        const synthesisResult = await synthesisResponse.json();
        const taskId = synthesisResult.output && synthesisResult.output.task_id;

        if (!taskId) {
            console.error('Failed to get task_id from synthesis response:', synthesisResult);
            return res.status(500).json({ error: 'Failed to initiate image generation task.' });
        }

        console.log(`Image generation task started. Task ID: ${taskId}`);

        // Polling mechanism to check task status
        let taskStatus = synthesisResult.output.task_status;
        let taskResultData;
        const maxRetries = 30; // e.g., 30 retries * 2 seconds = 1 minute timeout
        let retries = 0;

        while (taskStatus === 'PENDING' || taskStatus === 'RUNNING') {
            if (retries >= maxRetries) {
                console.error(`Task ${taskId} timed out after ${maxRetries} retries.`);
                return res.status(500).json({ error: 'Image generation timed out.' });
            }
            retries++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before polling again

            console.log(`Polling task ${taskId}, attempt ${retries}`);
            const taskQueryResponse = await fetch(`${taskQueryBaseUrl}${taskId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` }
            });

            if (!taskQueryResponse.ok) {
                // If task query fails, don't immediately give up, maybe a transient issue
                console.warn(`Failed to query task ${taskId} status: ${taskQueryResponse.statusText}. Retrying...`);
                taskStatus = 'RUNNING'; // Assume it's still running to retry
                continue;
            }
            
            taskResultData = await taskQueryResponse.json();
            taskStatus = taskResultData.output && taskResultData.output.task_status;
            console.log(`Task ${taskId} status: ${taskStatus}`);
        }

        if (taskStatus === 'SUCCEEDED') {
            const imageUrl = taskResultData.output.results && taskResultData.output.results[0] && taskResultData.output.results[0].url;
            if (!imageUrl) {
                console.error('Image URL not found in successful task result:', taskResultData.output);
                // Do not save user prompt if AI fails to return an image URL
                if (isNewConversation) history.shift(); // Remove new conversation stub
                else currentConversation.messages.pop(); // Remove user prompt message
                await saveHistory(history);
                return res.status(500).json({ error: 'Image generated, but URL not found.' });
            }
            
            console.log(`Image generated successfully: ${imageUrl}`);

            // Add AI's image URL to history
            currentConversation.messages.push({ 
                sender: 'ai', 
                text: imageUrl, // Store the image URL
                type: 'image', // Mark as image type
                timestamp: new Date().toISOString() 
            });
            currentConversation.lastUpdated = new Date().toISOString();

            // Ensure conversation is at the top of history
            const updatedHistory = history.filter(c => c.id !== conversationId);
            updatedHistory.unshift(currentConversation);
            await saveHistory(updatedHistory);

            res.json({ reply: imageUrl, type: 'image', conversationId: currentConversation.id });

        } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
            console.error(`Task ${taskId} failed or was canceled. Status: ${taskStatus}`, taskResultData.output);
            // Do not save user prompt if AI task fails
            if (isNewConversation) history.shift();
            else currentConversation.messages.pop();
            await saveHistory(history);
            return res.status(500).json({ error: `Image generation task failed or was canceled. ${taskResultData.output?.message || ''}`.trim() });
        } else {
            console.error(`Task ${taskId} finished with unexpected status: ${taskStatus}`, taskResultData.output);
             // Do not save user prompt for unknown errors
            if (isNewConversation) history.shift();
            else currentConversation.messages.pop();
            await saveHistory(history);
            return res.status(500).json({ error: 'Image generation task finished with an unexpected status.' });
        }

    } catch (error) {
        console.error('Error during image generation process:', error);
        // Attempt to roll back history changes on general error
        if (currentConversation && currentConversation.messages.some(m => m.sender === 'user' && m.text === prompt)) {
            currentConversation.messages.pop(); // Remove user prompt
            if (isNewConversation && history[0] && history[0].id === currentConversation.id) {
                history.shift();
            }
        }
        await saveHistory(history); // Save potentially rolled-back history
        res.status(500).json({ error: 'Internal server error during image generation.' });
    }
});

// Get all conversation summaries
app.get('/api/history', async (req, res) => {
    const history = await loadHistory();
    const summaries = history.map(conv => ({
        id: conv.id,
        title: conv.title || (conv.messages.length > 0 ? conv.messages[0].text.substring(0,30) + '...' : 'Untitled Chat'),
        lastUpdated: conv.lastUpdated,
        messageCount: conv.messages.length
    })).sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)); // Sort by most recently updated
    res.json(summaries);
});

// Get a specific conversation's messages
app.get('/api/history/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    const history = await loadHistory();
    const conversation = history.find(conv => conv.id === conversationId);
    if (conversation) {
        res.json(conversation);
    } else {
        res.status(404).json({ error: 'Conversation not found' });
    }
});

// Delete a specific conversation
app.delete('/api/history/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    let history = await loadHistory();
    const initialLength = history.length;
    history = history.filter(conv => conv.id !== conversationId);
    if (history.length < initialLength) {
        await saveHistory(history);
        res.json({ message: 'Conversation deleted successfully' });
    } else {
        res.status(404).json({ error: 'Conversation not found or already deleted' });
    }
});

// Delete all conversations
app.delete('/api/history', async (req, res) => {
    await saveHistory([]); // Save an empty array
    res.json({ message: 'All conversations deleted successfully' });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    // Initialize history file if it doesn't exist
    loadHistory().then(history => {
        if (history.length === 0) {
             saveHistory([]); // Ensure the file is created if it wasn't there
        }
    });
}); 