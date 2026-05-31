# 🚀 HOW TO RUN THE APPLICATION

## Step 1: Install Dependencies

### Server
```bash
cd server
npm install
```

### Client
```bash
cd client
npm install
```

## Step 2: Start MongoDB

Make sure MongoDB is running on your system:
```bash
mongod
```

Or use MongoDB Atlas (cloud) - update the MONGODB_URI in server/.env

## Step 3: Start the Application

### Terminal 1 - Backend Server
```bash
cd server
npm run dev
```
✅ Server running on http://localhost:5000

### Terminal 2 - Frontend Client
```bash
cd client
npm start
```
✅ Client running on http://localhost:3000

## Step 4: Test the Application

1. Open http://localhost:3000
2. Click "Sign Up" and create an account
3. After login, click "Create New Room"
4. Allow camera and microphone permissions
5. Share the Room ID with others to join
6. Test video, audio, and chat features

## 🎯 Features Available

✅ User Registration & Login (JWT Authentication)
✅ Create Video Conference Rooms
✅ Join Rooms with Room ID
✅ Real-time Video Streaming (WebRTC)
✅ Audio Controls (Mute/Unmute)
✅ Video Controls (Start/Stop Camera)
✅ Real-time Chat Messaging
✅ Multiple Participants (up to 10)
✅ Responsive Design
✅ Room Management

## 📝 Environment Variables

Both .env files are already created with default values:

**Server (.env):**
- PORT=5000
- MONGODB_URI=mongodb://localhost:27017/video-conferencing
- JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
- CLIENT_URL=http://localhost:3000

**Client (.env):**
- REACT_APP_API_URL=http://localhost:5000
- REACT_APP_SOCKET_URL=http://localhost:5000

## 🔧 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check connection string in server/.env

### Port Already in Use
- Change PORT in server/.env
- Update URLs in client/.env accordingly

### Camera/Microphone Not Working
- Check browser permissions
- Use HTTPS in production (required for WebRTC)
- Try Chrome or Firefox (best WebRTC support)

### Dependencies Installation Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🌐 Browser Support

Best experience in:
- ✅ Chrome (Recommended)
- ✅ Firefox
- ✅ Edge
- ⚠️ Safari (limited WebRTC support)

## 📦 Tech Stack

**Frontend:**
- React.js 18
- Tailwind CSS
- Socket.io Client
- Simple-peer (WebRTC)
- Axios
- React Router

**Backend:**
- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.io
- JWT Authentication
- bcryptjs

**Real-time:**
- WebRTC for video/audio
- Socket.io for signaling and chat

## 🎓 Next Steps

1. Customize the UI/styling
2. Add screen sharing feature
3. Implement recording functionality
4. Add user profiles with avatars
5. Deploy to production (Heroku, AWS, etc.)

## 📚 Documentation

- Full README: See README.md
- Quick Start: See QUICKSTART.md
- API Documentation: Check server routes

Enjoy your video conferencing app! 🎉
