# Lotto API - Restructured with Modular Controllers

Your `lotto-api` has been restructured to follow the modular pattern from the `node-express` TypeScript example, while keeping all the original functionality and your existing database schema.

## 🏗️ **New Modular Structure**

```
lotto-api/
├── controllers/           # 🎮 Modular route controllers
│   ├── auth.js           # Authentication (login, register)
│   ├── tickets.js        # Ticket management (get, purchase)
│   ├── admin.js          # Admin functions (stats, reset, users)
│   └── prizes.js         # Prize claiming functionality
├── dbconnect.js          # 🗄️ Database connection module
├── middleware.js         # 🛡️ Common middleware functions
└── server.js             # 🚀 Main server (REST API + WebSocket)
```

## ✅ **What Was Restructured**

### **1. Database Connection (`dbconnect.js`)**
- Extracted database config and connection logic
- Added schema validation function
- Environment variable support with fallbacks

### **2. Modular Controllers**
- **`auth.js`** - User registration and login endpoints
- **`tickets.js`** - Ticket listing, user tickets, and purchasing
- **`admin.js`** - Admin statistics, ticket generation, user management
- **`prizes.js`** - Prize claiming with mock winning system

### **3. Middleware (`middleware.js`)**
- Common error handling
- Request logging
- CORS configuration
- Auth and admin role checking (ready for JWT)

### **4. Main Server (`server.js`)**
- Hybrid REST API + WebSocket server
- Uses modular controllers for REST endpoints
- Keeps original WebSocket functionality for real-time features
- Organized startup with clear endpoint documentation

## 🌐 **API Endpoints**

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### **Tickets** 
- `GET /api/tickets/` - Get all tickets
- `GET /api/tickets/user/:userId` - Get user's tickets
- `POST /api/tickets/purchase` - Purchase tickets

### **Admin**
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/reset` - Generate new 120 lottery tickets
- `GET /api/admin/users` - Get all users
- `GET /api/admin/purchases` - Get all purchases

### **Prizes**
- `GET /api/prizes/` - Get all prizes
- `POST /api/prizes/claim` - Claim prize

### **Health Check**
- `GET /health` - Server health status

## 🔄 **WebSocket Events (Unchanged)**
All your original WebSocket events still work:
- `auth:login`, `auth:register`
- `tickets:get-all`, `tickets:get-user`, `tickets:select`
- `admin:get-stats`, `admin:create-tickets`
- `claim:prize`

## 🚀 **How to Run**

```bash
# Navigate to lotto-api folder
cd lotto-api

# Install dependencies (if needed)
npm install

# Start the server
npm start
# OR
node server.js
```

The server will start on port 3000 (or your environment PORT) and show:
```
🚀 Lotto Server (REST + WebSocket) running on port 3000
🌐 REST API available at: http://localhost:3000/api/
🌐 WebSocket Server ready for connections
```

## 💡 **Benefits of Restructuring**

1. **📁 Better Organization** - Code is now modular and easier to maintain
2. **🔧 Easier Debugging** - Each functionality is in its own file
3. **📊 REST API Support** - Can now use both REST calls and WebSocket
4. **⚡ Faster Development** - Add new features by creating new controllers
5. **🛡️ Centralized Middleware** - Common functions in one place
6. **📖 Better Documentation** - Clear separation of concerns

## 🎯 **Usage Examples**

### **REST API Example:**
```bash
# Login via REST
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Get all tickets via REST  
curl http://localhost:3000/api/tickets/

# Purchase tickets via REST
curl -X POST http://localhost:3000/api/tickets/purchase \
  -H "Content-Type: application/json" \
  -d '{"ticketIds": [1, 2, 3], "userId": 1}'
```

### **WebSocket Example (unchanged):**
```javascript
// Your existing WebSocket code still works
socket.emit('auth:login', { username: 'admin', password: 'admin123' });
socket.emit('tickets:get-all');
socket.emit('claim:prize', { userId: 1, ticketNumber: '123456' });
```

## 🔧 **Next Steps**

1. **Test Both APIs** - Verify REST and WebSocket work as expected
2. **Update Flutter App** - Choose between REST or WebSocket based on needs
3. **Add JWT Authentication** - Uncomment JWT middleware for production
4. **Add Validation** - Enhance input validation in controllers
5. **Error Handling** - Customize error messages and codes

## 📝 **Notes**

- Your database schema remains **exactly the same**
- All original functionality is preserved
- WebSocket events work identically to before
- Environment variables are supported
- Database validation and initialization still work
- The prize claiming system includes a mock winning algorithm (30% win rate)

This restructuring gives you the **best of both worlds**: the organized, maintainable structure from the TypeScript example, while keeping all your existing functionality and database setup intact!