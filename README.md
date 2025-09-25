# Lotto API Backend

REST API backend สำหรับระบบลอตเตอรี่ออนไลน์

## 🚀 Quick Start

### การติดตั้ง
```bash
npm install
```

### การรัน Development
```bash
npm run dev
```

### การรัน Production
```bash
npm start
```

## 🔧 Configuration

### Environment Variables
สร้างไฟล์ `.env` หรือตั้งค่า environment variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASS=your_database_password
DB_NAME=your_database_name

# Security
JWT_SECRET=your_jwt_secret_key
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=*
```

## 📊 Database Setup

1. สร้างฐานข้อมูล MySQL
2. Import schema จากไฟล์ `database_schema.sql`
3. ตั้งค่า connection ใน `.env`

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/register` - สมัครสมาชิก
- `POST /api/auth/refresh` - รีเฟรช token
- `POST /api/auth/logout` - ออกจากระบบ

### User Management
- `GET /api/users/profile` - ข้อมูลผู้ใช้
- `PUT /api/users/wallet` - อัพเดทกระเป๋าเงิน
- `GET /api/users/purchases` - ประวัติการซื้อ
- `GET /api/users/winnings` - ประวัติการถูกรางวัล

### Tickets
- `GET /api/tickets` - รายการตั๋วทั้งหมด
- `GET /api/tickets/my-tickets` - ตั๋วของฉัน
- `POST /api/tickets/purchase` - ซื้อตั๋ว

### Prizes
- `GET /api/prizes` - รายการรางวัล
- `POST /api/prizes/claim` - เคลมรางวัล
- `GET /api/prizes/check/:ticketNumber` - ตรวจสอบรางวัล

### Admin (ต้องมีสิทธิ์ admin)
- `GET /api/admin/stats` - สstatistics
- `GET /api/admin/overview` - ภาพรวมระบบ
- `GET /api/admin/users` - จัดการผู้ใช้
- `GET /api/admin/tickets` - จัดการตั๋ว
- `POST /api/admin/draws` - สร้างการออกรางวัล
- `POST /api/admin/reset` - รีเซ็ตระบบ

### Health Check
- `GET /health` - ตรวจสอบสถานะ API

## 🚀 Deployment

### Render.com
1. เชื่อมต่อ GitHub repository
2. ตั้งค่า environment variables
3. Deploy

### Heroku
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set DB_HOST=your_db_host
# ... ตั้งค่า env vars อื่นๆ
git push heroku main
```

### Railway
1. เชื่อมต่อ GitHub repository
2. ตั้งค่า environment variables
3. Deploy

## 📁 Project Structure

```
lotto-api/
├── config/           # การตั้งค่า
├── controllers/      # API controllers
├── database/         # Database utilities
├── helpers/          # Helper functions
├── middleware/       # Express middleware
├── services/         # Business logic
├── utils/           # Utility functions
├── .env             # Environment variables
├── server.js        # Main server file
├── package.json     # Dependencies
└── database_schema.sql # Database schema
```

## 🔒 Security Features

- JWT Authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention

## 📝 Notes

- ใช้ MySQL database
- รองรับ CORS สำหรับ Flutter app
- มี rate limiting ป้องกัน abuse
- Auto-generate lottery tickets
- Complete user management system