# 🎰 Lotto API Backend

REST API สำหรับระบบลอตเตอรี่ออนไลน์

## 🚀 Quick Start

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Setup Configuration**
```bash
# คัดลอกไฟล์ config ตัวอย่าง
cp config.json.example config.json

# แก้ไขไฟล์ config.json ตามต้องการ
```

### 3. **Start Server**
```bash
# Development
npm run dev

# Production
npm start
```

## 📁 Configuration

### **config.json**
```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "database": {
    "host": "your-db-host",
    "port": 3306,
    "user": "your-username",
    "password": "your-password",
    "database": "your-database"
  },
  "cors": {
    "origin": "*"
  }
}
```

## 🌐 API Endpoints

### **Health Check**
```
GET /health
```

### **Authentication**
```
POST /api/auth/login
POST /api/register
```

### **Tickets**
```
GET /api/tickets
POST /api/tickets/purchase
```

### **Admin**
```
GET /api/admin/stats
POST /api/admin/reset
```

### **Prizes**
```
GET /api/prizes
POST /api/prizes/claim
```

## 🚀 Deploy on Render

### 1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 2. **Create Web Service on Render**
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:**
  ```
  NODE_ENV=production
  DB_HOST=your-database-host
  DB_PORT=3306
  DB_USER=your-username
  DB_PASS=your-password
  DB_NAME=your-database
  CORS_ORIGIN=*
  ```

### 3. **Auto Deploy**
ใช้ไฟล์ `render.yaml` สำหรับ auto deploy

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `DB_USER` | Database user | `root` |
| `DB_PASS` | Database password | `` |
| `DB_NAME` | Database name | `lotto_db` |
| `CORS_ORIGIN` | CORS origin | `*` |

## 📊 Database Schema

### **Tables:**
- `User` - ข้อมูลผู้ใช้
- `Ticket` - ข้อมูลตั๋วลอตเตอรี่
- `Purchase` - ข้อมูลการซื้อ
- `Prize` - ข้อมูลรางวัล

## 🔒 Security

- ใช้ Environment Variables สำหรับข้อมูลสำคัญ
- CORS configuration
- Input validation
- Error handling

## 📝 License

MIT License