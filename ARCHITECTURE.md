# Lotto API - Modular Structure Documentation

## 📁 Project Organization

The lotto-api has been refactored from a single large file (1439 lines) into a well-organized modular structure. This improves maintainability, readability, and code reusability while maintaining 100% functionality.

## 📂 Directory Structure

```
lotto-api/
├── config/
│   └── database.js           # Database configuration and connection
├── controllers/
│   ├── authController.js     # Authentication handlers (login, register)
│   ├── ticketController.js   # Ticket management (get, select, purchase)
│   ├── adminController.js    # Admin functions (stats, create tickets, reset)
│   └── prizeController.js    # Prize and draw management (draw, claim)
├── models/
│   └── UserSession.js        # User session management class
├── services/
│   ├── UserService.js        # User database operations
│   ├── TicketService.js      # Ticket database operations
│   └── PrizeService.js       # Prize and purchase database operations
├── utils/
│   ├── helpers.js            # Validation and utility functions
│   └── ticketInitializer.js  # Lottery ticket initialization
├── middleware/               # (Empty - for future middleware)
├── server.js                 # Main server file (now clean and modular)
├── server-backup.js          # Backup of original monolithic server
└── [existing files...]       # package.json, README.md, etc.
```

## 🏗️ Architecture Details

### **Config Layer** (`config/`)
- **database.js**: Centralized database configuration, connection management, and initialization functions

### **Controller Layer** (`controllers/`)
- **authController.js**: Handles user authentication (login, register) and authorization checks
- **ticketController.js**: Manages ticket operations (get all tickets, user tickets, selection, purchase)
- **adminController.js**: Admin-only functions (statistics, ticket creation, system reset, session management)
- **prizeController.js**: Prize and draw system (draw prizes, get latest results, claim prizes)

### **Model Layer** (`models/`)
- **UserSession.js**: User session state management with authentication tracking, wallet updates, and ticket selection

### **Service Layer** (`services/`)
- **UserService.js**: All user-related database operations (find, create, update wallet, statistics)
- **TicketService.js**: All ticket-related database operations (CRUD, purchase, claim, statistics)
- **PrizeService.js**: Prize and purchase database operations (create prizes, manage purchases)

### **Utility Layer** (`utils/`)
- **helpers.js**: Validation functions, data formatting, lottery number generation
- **ticketInitializer.js**: System initialization for lottery tickets

## 🔄 Functionality Preservation

### **All Original Features Maintained:**
✅ WebSocket-based real-time communication  
✅ User authentication (login/register)  
✅ Ticket management (view, select, purchase)  
✅ Admin panel (statistics, ticket creation, system reset)  
✅ Prize system (draw prizes, claim rewards)  
✅ Session management  
✅ Database initialization  
✅ Error handling  

### **Improvements Added:**
🚀 **Better Code Organization**: Separated concerns into logical modules  
🛡️ **Enhanced Error Handling**: Centralized validation and error responses  
🧪 **Easier Testing**: Modular structure allows unit testing of individual components  
📖 **Better Maintainability**: Code is easier to read, modify, and debug  
⚡ **Improved Performance**: Better memory management through modular loading  

## 🚀 Usage

### **Starting the Server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### **File Size Comparison**
- **Original server.js**: 1,439 lines (55.7KB)
- **New server.js**: 173 lines (5.0KB)
- **Total modular code**: ~1,500 lines across 11 files

## 🔧 Configuration

The modular structure uses the same `.env` configuration:
```env
DB_HOST=localhost
DB_USER=your_user
DB_PASS=your_password
DB_NAME=your_database
DB_PORT=3306
PORT=3000
```

## 🛠️ Development Guidelines

### **Adding New Features**
1. **Controllers**: Add new event handlers in appropriate controller files
2. **Services**: Add database operations to relevant service files
3. **Models**: Create new data models as separate files
4. **Utils**: Add utility functions to helpers.js or create new utility files

### **Code Organization Principles**
- **Single Responsibility**: Each file has a specific purpose
- **Separation of Concerns**: Business logic separated from data access
- **DRY Principle**: Common functionality extracted to utilities
- **Consistent Naming**: Clear, descriptive file and function names

## 📊 WebSocket Events

All original WebSocket events are preserved and now handled by their respective controllers:

### **Authentication Events**
- `auth:login` → `authController.js`
- `auth:register` → `authController.js`

### **Ticket Events**
- `tickets:get-all` → `ticketController.js`
- `tickets:get-user` → `ticketController.js`
- `tickets:select` → `ticketController.js`
- `tickets:deselect` → `ticketController.js`
- `tickets:purchase` → `ticketController.js`

### **Admin Events**
- `admin:get-stats` → `adminController.js`
- `admin:create-tickets` → `adminController.js`
- `admin:reset` → `adminController.js`
- `session:get-all` → `adminController.js`

### **Prize Events**
- `admin:draw-prizes` → `prizeController.js`
- `draw:get-latest` → `prizeController.js`
- `claim:prize` → `prizeController.js`

## 🔒 Security & Validation

All input validation and security checks have been preserved and enhanced:
- User authentication verification
- Admin privilege checking
- Input sanitization and validation
- Database transaction safety

## 📈 Benefits

1. **Maintainability**: Each module can be modified independently
2. **Scalability**: Easy to add new features without affecting existing code
3. **Testability**: Individual components can be unit tested
4. **Readability**: Code is organized logically and easy to understand
5. **Collaboration**: Multiple developers can work on different modules
6. **Debugging**: Issues can be isolated to specific modules

## 🔄 Migration Notes

- **Original server.js** is backed up as `server-backup.js`
- **Zero functionality loss** - all features work exactly as before
- **Same client interface** - no changes needed on the Flutter app side
- **Same database schema** - no database changes required
- **Same configuration** - existing `.env` files work without modification

The refactored structure provides a solid foundation for future development while maintaining all existing functionality and improving code quality significantly.