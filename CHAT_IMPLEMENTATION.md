# Real-Time Chat Implementation Guide

Complete real-time chat system with room-based messaging, private DMs, reactions, replies, typing indicators, and more.

---

## Features Implemented

### ✅ Core Features
- **Room-based chat**: Messages visible to all participants in a room
- **Private DMs**: Direct messages between two users
- **Message types**: Text, emoji, file attachments, system messages
- **Emoji picker**: Custom emoji picker with 8 categories (500+ emojis)
- **Message reactions**: 5 quick reactions (👍❤️😂😮😢)
- **Reply to message**: Threaded conversations with reply preview
- **Message status**: Delivered (✓) and read (✓✓) indicators
- **Typing indicator**: "John is typing..." with 3-second timeout
- **Message search**: Full-text search within room
- **Copy message**: Copy message text to clipboard

### ✅ Additional Features
- **Message editing**: Edit your own messages (marked as "edited")
- **Message deletion**: Soft delete with confirmation
- **Pagination**: Load 50 messages at a time, infinite scroll
- **Date separators**: "Today", "Yesterday", "Dec 15"
- **Unread count**: Badge showing unread message count
- **Auto-scroll**: Smooth scroll to latest message
- **Timestamps**: Show on hover
- **Message highlighting**: Highlight message when clicked from search
- **E2E encryption support**: Optional encrypted messages with IV and auth tag

---

## Architecture

### Backend (Node.js + MongoDB)

```
server/
├── src/
│   ├── models/
│   │   └── Message.js              # Message schema with reactions, replies
│   ├── controllers/
│   │   └── chatController.js       # REST API endpoints
│   ├── routes/
│   │   └── chatRoutes.js           # Chat routes
│   ├── socket/
│   │   └── chatHandlers.js         # Real-time socket events
│   └── middleware/
│       └── inputValidation.js      # Joi validation for messages
```

### Frontend (React + Tailwind)

```
client/src/components/Chat/
├── ChatPanel.jsx           # Main chat container (slide-in panel)
├── ChatButton.jsx          # Toggle button with unread badge
├── MessageBubble.jsx       # Individual message component
├── MessageInput.jsx        # Input field with emoji picker
├── EmojiPicker.jsx         # Custom emoji picker (8 categories)
├── TypingIndicator.jsx     # "User is typing..." indicator
└── MessageSearch.jsx       # Search messages component
```

---

## Installation

### Backend Dependencies

Already installed (no new dependencies needed):
- `mongoose` - MongoDB ODM
- `socket.io` - Real-time communication
- `joi` - Input validation

### Frontend Dependencies

No additional dependencies needed. Custom emoji picker built from scratch.

---

## Database Schema

### Message Model

```javascript
{
  roomId: String,              // Room ID (for room messages)
  recipientId: ObjectId,       // User ID (for DMs)
  senderId: ObjectId,          // Sender user ID
  content: String,             // Message content (max 5000 chars)
  type: String,                // 'text', 'emoji', 'file', 'system'
  replyTo: ObjectId,           // Reference to replied message
  reactions: [{
    userId: ObjectId,
    emoji: String,             // '👍', '❤️', '😂', '😮', '😢'
    createdAt: Date
  }],
  fileAttachment: {
    fileId: ObjectId,
    fileName: String,
    fileSize: Number,
    fileType: String
  },
  isEdited: Boolean,
  editedAt: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  readBy: [{
    userId: ObjectId,
    readAt: Date
  }],
  deliveredTo: [{
    userId: ObjectId,
    deliveredAt: Date
  }],
  encrypted: Boolean,          // E2E encryption flag
  iv: String,                  // Initialization vector
  authTag: String,             // Authentication tag
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
// Performance indexes
{ roomId: 1, createdAt: -1 }           // Room messages sorted by date
{ senderId: 1, recipientId: 1 }        // DM messages
{ content: 'text' }                     // Full-text search
```

---

## API Endpoints

### REST API

```javascript
// Get room messages (paginated)
GET /api/chat/room/:roomId?page=1&limit=50

// Get DM messages
GET /api/chat/dm/:userId?page=1&limit=50

// Send message
POST /api/chat/send
Body: {
  roomId?: string,
  recipientId?: string,
  content: string,
  type?: 'text' | 'emoji' | 'file' | 'system',
  replyTo?: string,
  fileAttachment?: object,
  encrypted?: boolean,
  iv?: string,
  authTag?: string
}

// Edit message
PUT /api/chat/:messageId
Body: { content: string }

// Delete message
DELETE /api/chat/:messageId

// React to message
POST /api/chat/:messageId/react
Body: { emoji: string }

// Remove reaction
DELETE /api/chat/:messageId/react

// Mark as read
POST /api/chat/:messageId/read

// Search messages
GET /api/chat/room/:roomId/search?q=query&limit=20

// Get unread count
GET /api/chat/room/:roomId/unread
```

### Socket Events

**Client → Server:**
```javascript
// Send message
socket.emit('message:send', {
  roomId,
  content,
  type,
  replyTo,
  encrypted,
  iv,
  authTag
});

// Edit message
socket.emit('message:edit', { messageId, content });

// Delete message
socket.emit('message:delete', { messageId });

// React to message
socket.emit('message:react', { messageId, emoji });

// Remove reaction
socket.emit('message:unreact', { messageId });

// Mark as read
socket.emit('message:read', { messageId });

// Mark all as read
socket.emit('messages:mark-all-read', { roomId });

// Typing indicators
socket.emit('typing:start', { roomId });
socket.emit('typing:stop', { roomId });
```

**Server → Client:**
```javascript
// Message received
socket.on('message:received', ({ message }) => {});

// Message edited
socket.on('message:edited', ({ messageId, content, editedAt }) => {});

// Message deleted
socket.on('message:deleted', ({ messageId }) => {});

// Message reacted
socket.on('message:reacted', ({ messageId, userId, emoji, reactions }) => {});

// Reaction removed
socket.on('message:reaction-removed', ({ messageId, userId, reactions }) => {});

// Message read
socket.on('message:read', ({ messageId, userId, readAt }) => {});

// Typing indicators
socket.on('typing:start', ({ userId, userName, roomId }) => {});
socket.on('typing:stop', ({ userId, roomId }) => {});
```

---

## Usage Examples

### 1. Integrate Chat into Room Component

```jsx
import React, { useState } from 'react';
import ChatPanel from '../components/Chat/ChatPanel';
import ChatButton from '../components/Chat/ChatButton';

const Room = ({ roomId }) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative">
      {/* Your room content */}
      <div className="room-content">
        {/* Video grid, controls, etc. */}
      </div>

      {/* Chat Button (fixed position) */}
      <div className="fixed bottom-6 right-6 z-40">
        <ChatButton
          roomId={roomId}
          onClick={() => setChatOpen(!chatOpen)}
          isOpen={chatOpen}
        />
      </div>

      {/* Chat Panel (slide-in from right) */}
      <ChatPanel
        roomId={roomId}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
};
```

### 2. Send Message with Reply

```javascript
// In MessageInput component
const handleSend = (content) => {
  socket.emit('message:send', {
    roomId: 'ROOM123',
    content: 'Hello everyone!',
    type: 'text',
    replyTo: replyToMessage?.id || null
  });
};
```

### 3. React to Message

```javascript
// In MessageBubble component
const handleReact = (emoji) => {
  socket.emit('message:react', {
    messageId: message.id,
    emoji: '👍'
  });
};
```

### 4. Search Messages

```javascript
import { searchMessages } from '../../services/chatApi';

const handleSearch = async (query) => {
  const results = await searchMessages(roomId, query, 20);
  setSearchResults(results.messages);
};
```

### 5. Send Encrypted Message

```javascript
import e2eEncryption from '../../utils/encryption';

const sendEncryptedMessage = async (content, recipientId) => {
  const { ciphertext, iv } = await e2eEncryption.encryptMessage(
    content,
    recipientId
  );

  socket.emit('message:send', {
    roomId,
    content: ciphertext,
    type: 'text',
    encrypted: true,
    iv: iv
  });
};
```

---

## UI Components

### ChatPanel

Main chat container with:
- Header with search and close buttons
- Scrollable message list with infinite scroll
- Date separators ("Today", "Yesterday")
- Typing indicator at bottom
- Message input with emoji picker

**Props:**
- `roomId` (string): Room ID
- `isOpen` (boolean): Panel visibility
- `onClose` (function): Close handler

### ChatButton

Floating action button with:
- Unread count badge
- New message animation
- Pulse effect for unread messages

**Props:**
- `roomId` (string): Room ID
- `onClick` (function): Click handler
- `isOpen` (boolean): Current state

### MessageBubble

Individual message with:
- Sender avatar and name
- Message content with formatting
- Reply preview
- Reactions display
- Edit/delete actions (own messages)
- Timestamp on hover
- Read receipts (✓✓)

**Props:**
- `message` (object): Message data
- `isOwn` (boolean): Is current user's message
- `onReply` (function): Reply handler
- `onReact` (function): React handler
- `onEdit` (function): Edit handler
- `onDelete` (function): Delete handler

### MessageInput

Input field with:
- Auto-resizing textarea (max 120px)
- Emoji picker button
- File attachment button
- Send button (disabled when empty)
- Reply preview with cancel
- Character count (when > 4500)
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

**Props:**
- `onSend` (function): Send handler
- `onTyping` (function): Typing handler
- `replyTo` (object): Message being replied to
- `onCancelReply` (function): Cancel reply handler

### EmojiPicker

Custom emoji picker with:
- 8 categories (500+ emojis)
- Category tabs with icons
- Scrollable emoji grid
- Hover scale effect

**Props:**
- `onSelect` (function): Emoji select handler
- `onClose` (function): Close handler

### TypingIndicator

Animated typing indicator with:
- User names display
- Bouncing dots animation
- Multiple users support ("John and 2 others are typing")

**Props:**
- `users` (array): Array of user names typing

### MessageSearch

Search panel with:
- Debounced search input (500ms)
- Highlighted search results
- Click to scroll to message
- Result count display

**Props:**
- `roomId` (string): Room ID
- `onClose` (function): Close handler
- `onResultClick` (function): Result click handler

---

## Styling

All components use Tailwind CSS with:
- Responsive design
- Smooth transitions
- Hover effects
- Focus states
- Animations (bounce, pulse, spin)

### Color Scheme

- **Own messages**: Blue background (`bg-blue-600`)
- **Others' messages**: White background with gray border
- **Reactions**: Gray background, blue when user reacted
- **Unread badge**: Red background (`bg-red-500`)
- **Typing indicator**: Gray background with bouncing dots

---

## Performance Optimizations

1. **Pagination**: Load 50 messages at a time
2. **Debounced search**: 500ms delay before searching
3. **Lazy loading**: Load more on scroll to top
4. **Optimistic updates**: Instant UI updates before server confirmation
5. **Socket event cleanup**: Proper event listener removal
6. **Memoization**: React.memo for message components (can be added)
7. **Virtual scrolling**: Can be added for very long message lists

---

## Security Features

1. **Input sanitization**: DOMPurify for XSS prevention
2. **Input validation**: Joi schemas on backend
3. **Rate limiting**: Applied to chat endpoints
4. **Authentication**: JWT required for all endpoints
5. **Authorization**: Users can only edit/delete own messages
6. **E2E encryption**: Optional encrypted messages
7. **Audit logging**: All chat actions logged

---

## Testing

### Manual Testing

1. **Send message**: Type and send in chat
2. **Reply**: Click reply button, send reply
3. **React**: Click reaction button, select emoji
4. **Edit**: Click edit, modify message, save
5. **Delete**: Click delete, confirm
6. **Search**: Type in search, click result
7. **Typing**: Type in input, see indicator in other user's view
8. **Pagination**: Scroll to top, load more messages
9. **Unread count**: Close chat, send message from another user, see badge

### API Testing

```bash
# Get room messages
curl http://localhost:5000/api/chat/room/ROOM123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send message
curl -X POST http://localhost:5000/api/chat/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"roomId":"ROOM123","content":"Hello!","type":"text"}'

# Search messages
curl "http://localhost:5000/api/chat/room/ROOM123/search?q=hello" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Messages not appearing

**Check:**
1. Socket connection established
2. User joined room (`socket.join(roomId)`)
3. Message saved to database
4. Socket event emitted to correct room

### Typing indicator not working

**Check:**
1. `typing:start` event emitted on input change
2. `typing:stop` event emitted after 3 seconds
3. Timeout cleared properly
4. User ID tracked correctly

### Unread count incorrect

**Check:**
1. Messages marked as read when panel open
2. `message:read` event emitted
3. Unread count updated on new message
4. Count reset when panel opened

### Search not working

**Check:**
1. Text index created on `content` field
2. Query length >= 2 characters
3. Search debounce working (500ms)
4. Results displayed correctly

---

## Future Enhancements

1. **Voice messages**: Record and send audio
2. **Video messages**: Record and send video
3. **GIF support**: Giphy integration
4. **Stickers**: Custom sticker packs
5. **Message forwarding**: Forward to other rooms/users
6. **Message pinning**: Pin important messages
7. **Mentions**: @username mentions with notifications
8. **Link previews**: Show preview for URLs
9. **Code blocks**: Syntax highlighting for code
10. **Markdown support**: Bold, italic, lists, etc.
11. **Message translation**: Auto-translate messages
12. **Read receipts per user**: Show who read the message
13. **Message scheduling**: Schedule messages for later
14. **Chat export**: Export chat history as PDF/JSON

---

## Complete! ✅

The real-time chat system is fully implemented with:
- ✅ Room-based and private messaging
- ✅ Reactions, replies, editing, deletion
- ✅ Emoji picker with 500+ emojis
- ✅ Typing indicators
- ✅ Message search
- ✅ Read/delivered status
- ✅ Pagination and infinite scroll
- ✅ Date separators
- ✅ Unread count badge
- ✅ E2E encryption support
- ✅ Full security integration

**Ready for production use!** 🚀
