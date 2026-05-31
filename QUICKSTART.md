# Quick Start Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

## Installation Steps

### 1. Install Server Dependencies
```bash
cd server
npm install
```

### 2. Install Client Dependencies
```bash
cd ../client
npm install
```

### 3. Configure Environment Variables

**Server (.env file already created in server/)**
- Update `MONGODB_URI` if using MongoDB Atlas
- Change `JWT_SECRET` to a secure random string

**Client (.env file already created in client/)**
- Default configuration should work for local development

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# If using local MongoDB
mongod
```

### 5. Start the Application

**Terminal 1 - Start Backend Server:**
```bash
cd server
npm run dev
```
Server will run on http://localhost:5000

**Terminal 2 - Start Frontend Client:**
```bash
cd client
npm start
```
Client will run on http://localhost:3000

## Testing the Application

1. Open http://localhost:3000 in your browser
2. Click "Sign Up" to create a new account
3. After registration, you'll be redirected to the dashboard
4. Click "Create New Room" to start a video conference
5. Share the Room ID with others to join
6. Test video, audio, and chat features

## Features Implemented

✅ User Authentication (Register/Login with JWT)
✅ Create and Join Video Rooms
✅ Real-time Video Conferencing (WebRTC)
✅ Audio/Video Controls (Mute/Unmute)
✅ Real-time Chat
✅ Room Management
✅ Responsive Design
✅ Socket.io for Real-time Communication

## Troubleshooting

### Port Already in Use
If port 3000 or 5000 is already in use:
- Change `PORT` in server/.env
- Update `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` in client/.env

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGODB_URI` in server/.env
- For MongoDB Atlas, ensure IP whitelist is configured

### WebRTC Not Working
- Use HTTPS in production (WebRTC requires secure context)
- Check browser permissions for camera/microphone
- Ensure firewall allows WebRTC connections

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in .env
2. Use a production MongoDB instance
3. Deploy to services like Heroku, AWS, or DigitalOcean
4. Enable HTTPS

### Frontend
1. Build the React app: `npm run build`
2. Serve the build folder with a static server
3. Update API URLs to production backend
4. Deploy to Vercel, Netlify, or similar

## Browser Support
- Chrome (Recommended)
- Firefox
- Safari
- Edge

Note: WebRTC features work best in Chrome and Firefox.
