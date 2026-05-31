# Chat System Quick Start

Get the real-time chat system running in your video conferencing app in 5 minutes.

---

## Step 1: Install Dependencies (if needed)

The chat system uses existing dependencies. No new packages required!

---

## Step 2: Start Backend

The chat routes and socket handlers are already integrated. Just start the server:

```bash
cd server
npm run dev
```

**Verify chat endpoints:**
```bash
# Health check
curl http://localhost:5000/api/health

# Test chat endpoint (requires auth token)
curl http://localhost:5000/api/chat/room/TEST123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Step 3: Integrate Chat into Room Component

Update your `Room.jsx` or `VideoRoom.jsx`:

```jsx
import React, { useState } from 'react';
import ChatPanel from '../components/Chat/ChatPanel';
import ChatButton from '../components/Chat/ChatButton';

const Room = ({ roomId }) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative h-screen bg-gray-900">
      {/* Your existing room content */}
      <div className="flex-1">
        {/* Video grid, controls, whiteboard, etc. */}
      </div>

      {/* Chat Button - Fixed bottom right */}
      <div className="fixed bottom-6 right-6 z-40">
        <ChatButton
          roomId={roomId}
          onClick={() => setChatOpen(!chatOpen)}
          isOpen={chatOpen}
        />
      </div>

      {/* Chat Panel - Slides in from right */}
      <ChatPanel
        roomId={roomId}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
};

export default Room;
```

---

## Step 4: Test Chat Features

### 1. Open Two Browser Windows

```bash
# Window 1
http://localhost:3000/room/TEST123

# Window 2 (incognito or different browser)
http://localhost:3000/room/TEST123
```

### 2. Test Basic Messaging

**Window 1:**
1. Click chat button (bottom right)
2. Type "Hello from User 1"
3. Press Enter

**Window 2:**
- Should see message appear instantly
- Unread badge should show "1"
- Click chat button to open and read

### 3. Test Reactions

1. Hover over any message
2. Click reaction button (😀 icon)
3. Select an emoji (👍, ❤️, 😂, 😮, 😢)
4. See reaction appear on message

### 4. Test Reply

1. Hover over message
2. Click reply button (↩️ icon)
3. Type reply message
4. See reply preview above input
5. Send message

### 5. Test Typing Indicator

**Window 1:**
- Start typing in input field

**Window 2:**
- Should see "User 1 is typing..." with animated dots

### 6. Test Search

1. Send several messages with different content
2. Click search button (🔍 icon) in chat header
3. Type search query (e.g., "hello")
4. Click result to jump to message
5. Message should highlight briefly

### 7. Test Edit/Delete

1. Hover over your own message
2. Click edit button (✏️ icon)
3. Modify text and save
4. See "(edited)" indicator
5. Click delete button (🗑️ icon)
6. Confirm deletion

### 8. Test Emoji Picker

1. Click emoji button (😀) in input
2. Browse categories (Smileys, Animals, Food, etc.)
3. Click emoji to insert
4. Send message

---

## Step 5: Customize Styling (Optional)

### Change Chat Panel Width

```jsx
// In ChatPanel.jsx, line 1
<div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50">
//                                            ^^^^ Change to w-80, w-[500px], etc.
```

### Change Message Colors

```jsx
// In MessageBubble.jsx
// Own messages (currently blue)
className="bg-blue-600 text-white"
// Change to: bg-green-600, bg-purple-600, etc.

// Others' messages (currently white)
className="bg-white text-gray-800 border border-gray-200"
// Change to: bg-gray-100, bg-blue-50, etc.
```

### Change Chat Button Position

```jsx
// In Room.jsx
<div className="fixed bottom-6 right-6 z-40">
//                    ^^^^^^^^  ^^^^^^^ Change position
// Examples:
// - Top right: top-6 right-6
// - Bottom left: bottom-6 left-6
// - Center bottom: bottom-6 left-1/2 -translate-x-1/2
```

---

## Step 6: Add Chat to Multiple Pages

### Dashboard Chat (Global)

```jsx
// In Dashboard.jsx
import ChatPanel from '../components/Chat/ChatPanel';

const Dashboard = () => {
  const [activeDM, setActiveDM] = useState(null);

  return (
    <div>
      {/* User list */}
      <div className="users">
        {users.map(user => (
          <button onClick={() => setActiveDM(user.id)}>
            Chat with {user.name}
          </button>
        ))}
      </div>

      {/* DM Chat Panel */}
      {activeDM && (
        <ChatPanel
          recipientId={activeDM}
          isOpen={true}
          onClose={() => setActiveDM(null)}
        />
      )}
    </div>
  );
};
```

### Lobby Chat (Pre-room)

```jsx
// In Lobby.jsx
const Lobby = ({ roomId }) => {
  const [chatOpen, setChatOpen] = useState(true); // Open by default

  return (
    <div className="flex h-screen">
      {/* Left: Video preview */}
      <div className="flex-1">
        <VideoPreview />
      </div>

      {/* Right: Chat */}
      <div className="w-96">
        <ChatPanel
          roomId={roomId}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </div>
  );
};
```

---

## Step 7: Enable E2E Encryption (Optional)

### Update MessageInput to encrypt messages

```jsx
import e2eEncryption from '../../utils/encryption';

const MessageInput = ({ onSend, roomId }) => {
  const handleSend = async (content) => {
    // Encrypt message
    const { ciphertext, iv } = await e2eEncryption.encryptMessage(
      content,
      roomId // Use roomId as encryption key identifier
    );

    // Send encrypted message
    onSend(ciphertext, 'text', null, true, iv);
  };

  // ... rest of component
};
```

### Update MessageBubble to decrypt messages

```jsx
import e2eEncryption from '../../utils/encryption';

const MessageBubble = ({ message }) => {
  const [decryptedContent, setDecryptedContent] = useState('');

  useEffect(() => {
    if (message.encrypted) {
      decryptMessage();
    } else {
      setDecryptedContent(message.content);
    }
  }, [message]);

  const decryptMessage = async () => {
    try {
      const decrypted = await e2eEncryption.decryptMessage(
        message.content,
        message.iv,
        message.sender.id
      );
      setDecryptedContent(decrypted);
    } catch (error) {
      setDecryptedContent('[Encrypted message - unable to decrypt]');
    }
  };

  return (
    <div>
      {/* Display decrypted content */}
      <p>{decryptedContent}</p>
    </div>
  );
};
```

---

## Step 8: Add File Attachments (Optional)

### Update MessageInput to handle files

```jsx
const MessageInput = ({ onSend }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Upload file first (use existing file upload API)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);

    const response = await axios.post('/api/files/upload', formData);
    const uploadedFile = response.data.file;

    // Send message with file attachment
    onSend(
      `Shared a file: ${file.name}`,
      'file',
      {
        fileId: uploadedFile.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    );
  };

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.mp4"
      />

      {/* File button */}
      <button onClick={() => fileInputRef.current?.click()}>
        <svg>...</svg>
      </button>
    </div>
  );
};
```

---

## Troubleshooting

### Chat button not showing

**Check:**
```jsx
// Ensure z-index is high enough
<div className="fixed bottom-6 right-6 z-40">
//                                        ^^^^ Should be > other elements
```

### Messages not sending

**Check:**
1. Socket connected: `socket.connected === true`
2. User authenticated: Check JWT token
3. Room joined: `socket.emit('join-room', { roomId })`
4. Console errors: Open DevTools → Console

**Debug:**
```jsx
// Add logging in ChatPanel
socket.on('message:received', (data) => {
  console.log('Message received:', data);
  // ... handle message
});
```

### Typing indicator stuck

**Check:**
1. `typing:stop` event emitted after 3 seconds
2. Timeout cleared on component unmount
3. User disconnected properly

**Fix:**
```jsx
// In MessageInput
useEffect(() => {
  return () => {
    // Clear timeout on unmount
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('typing:stop', { roomId });
    }
  };
}, []);
```

### Unread count not updating

**Check:**
1. `getUnreadCount` API called on mount
2. `message:received` event updates count
3. Count reset when chat opened

**Debug:**
```jsx
// Add logging in ChatButton
useEffect(() => {
  console.log('Unread count:', unreadCount);
}, [unreadCount]);
```

### Search not working

**Check:**
1. Text index created on Message collection
2. Query length >= 2 characters
3. User has permission to access room

**Create index manually:**
```bash
mongo videoconference
db.messages.createIndex({ content: "text" })
```

---

## Performance Tips

### 1. Limit Initial Load

```jsx
// Load only 20 messages initially, then 50 on scroll
const [limit, setLimit] = useState(20);

useEffect(() => {
  loadMessages(1, limit);
}, []);
```

### 2. Debounce Typing Indicator

```jsx
// Already implemented with 3-second timeout
// Adjust timeout if needed
typingTimeoutRef.current = setTimeout(() => {
  stopTyping();
}, 3000); // Change to 2000, 5000, etc.
```

### 3. Virtualize Long Message Lists

For rooms with 1000+ messages, consider using `react-window`:

```bash
npm install react-window
```

```jsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## Security Checklist

- [x] Input sanitization (DOMPurify)
- [x] Input validation (Joi)
- [x] Authentication required (JWT)
- [x] Rate limiting applied
- [x] XSS prevention
- [x] SQL/NoSQL injection prevention
- [x] E2E encryption support
- [x] Audit logging enabled

---

## Next Steps

1. **Test thoroughly**: Send messages, reactions, replies
2. **Customize styling**: Match your app's design
3. **Add features**: File attachments, voice messages, etc.
4. **Monitor performance**: Check message load times
5. **Gather feedback**: Ask users for improvements

---

## Support

- **Documentation**: See `CHAT_IMPLEMENTATION.md`
- **API Reference**: Check `chatController.js`
- **Socket Events**: See `chatHandlers.js`
- **Components**: Browse `client/src/components/Chat/`

---

## Summary

You now have a fully functional real-time chat system with:

✅ Room-based messaging
✅ Private DMs
✅ Reactions (👍❤️😂😮😢)
✅ Threaded replies
✅ Message editing/deletion
✅ Emoji picker (500+ emojis)
✅ Typing indicators
✅ Message search
✅ Read receipts (✓✓)
✅ Unread count badge
✅ Pagination & infinite scroll
✅ Date separators
✅ E2E encryption support

**Ready to chat!** 💬🚀
