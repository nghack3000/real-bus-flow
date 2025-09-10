import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// For any other GET request, send the React app
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send a welcome message
  ws.send(JSON.stringify({ type: 'connection', message: 'Connected to Real Bus Flow WebSocket server' }));
  
  // Handle messages from clients
  ws.on('message', (message) => {
    console.log('Received:', message);
    
    // Echo the message back to the client
    ws.send(message);
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});