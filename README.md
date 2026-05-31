# Video Conferencing & Collaboration App

A full-stack real-time video conferencing application with chat, screen sharing, and collaboration features.

## Tech Stack

### Frontend
- **React.js** - UI framework
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time communication
- **Simple-peer** - WebRTC wrapper for peer connections

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Socket.io** - Real-time bidirectional communication
- **JWT** - Authentication

## Features

- 🎥 Real-time video conferencing (up to 10 participants)
- 💬 Live chat messaging
- 🖥️ Screen sharing
- 🎤 Audio/Video controls (mute/unmute)
- 🔐 JWT-based authentication
- 👥 User management
- 🏠 Room creation and management
- 📱 Responsive design

## Project Structure

```
video-conferencing-app/
├── client/          # React frontend
├── server/          # Node.js backend
└── shared/          # Shared utilities and constants
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd video-conferencing-app
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Install client dependencies**
```bash
cd ../client
npm install
```

4. **Set up environment variables**

Create `.env` file in the server directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video-conferencing
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

Create `.env` file in the client directory:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

5. **Start MongoDB**
```bash
# If using local MongoDB
mongod
```

6. **Run the application**

Terminal 1 - Start server:
```bash
cd server
npm run dev
```

Terminal 2 - Start client:
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Create Room**: Click "Create Room" to start a new video conference
3. **Join Room**: Enter a room ID to join an existing conference
4. **Controls**: Use the control panel to mute/unmute audio/video, share screen, or leave the room
5. **Chat**: Send messages to all participants in the room

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id` - Get room details
- `GET /api/rooms` - Get all active rooms

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## Socket Events

### Client → Server
- `join-room` - Join a video room
- `leave-room` - Leave a video room
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `ice-candidate` - Send ICE candidate
- `send-message` - Send chat message
- `toggle-audio` - Toggle audio state
- `toggle-video` - Toggle video state

### Server → Client
- `user-joined` - New user joined room
- `user-left` - User left room
- `room-users` - List of users in room
- `offer` - Receive WebRTC offer
- `answer` - Receive WebRTC answer
- `ice-candidate` - Receive ICE candidate
- `receive-message` - Receive chat message
- `user-media-state` - User's media state changed

## Development

### Running Tests
```bash
# Server tests
cd server
npm test

# Client tests
cd client
npm test
```

### Building for Production
```bash
# Build client
cd client
npm run build

# Start production server
cd ../server
npm start
```

## Security Considerations

- JWT tokens are stored in httpOnly cookies
- All API endpoints (except auth) require authentication
- Input validation on both client and server
- CORS configured for specific origins
- Rate limiting on authentication endpoints

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

Note: WebRTC features require HTTPS in production.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- WebRTC for peer-to-peer communication
- Socket.io for real-time features
- Simple-peer for simplified WebRTC implementation
"# -video-conferencing-app" 
"# video-conferencing-app" 
"# video-conferencing-app" 
