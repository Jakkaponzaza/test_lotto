# 🚀 Deployment Guide

## การเตรียม Deploy

### 1. ตรวจสอบไฟล์ที่จำเป็น
- ✅ `package.json` - Dependencies และ scripts
- ✅ `server.js` - Main server file
- ✅ `.env.production` - Production environment
- ✅ `render.yaml` - Render deployment config
- ✅ `database_schema.sql` - Database schema
- ✅ `README.md` - Documentation

### 2. Git Repository Setup
```bash
# ตรวจสอบ git status
git status

# Add ไฟล์ใหม่
git add .

# Commit changes
git commit -m "Prepare for deployment - Add deployment files"

# Push to GitHub
git push origin main
```

### 3. Database Setup (ถ้าใช้ database ใหม่)
1. สร้าง MySQL database
2. Import `database_schema.sql`
3. ตั้งค่า user และ permissions

## Deployment Options

### Option 1: Render.com (แนะนำ)
1. เข้า [render.com](https://render.com)
2. เชื่อมต่อ GitHub repository
3. เลือก `lotto-api` folder
4. Render จะอ่าน `render.yaml` อัตโนมัติ
5. ตั้งค่า environment variables:
   - `DB_HOST`
   - `DB_USER` 
   - `DB_PASS`
   - `DB_NAME`
   - `JWT_SECRET`
6. Deploy!

### Option 2: Railway
1. เข้า [railway.app](https://railway.app)
2. เชื่อมต่อ GitHub repository
3. ตั้งค่า environment variables
4. Deploy

### Option 3: Heroku
```bash
# Install Heroku CLI
heroku create lotto-api-your-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DB_HOST=your_db_host
heroku config:set DB_USER=your_db_user
heroku config:set DB_PASS=your_db_pass
heroku config:set DB_NAME=your_db_name
heroku config:set JWT_SECRET=your_jwt_secret

# Deploy
git push heroku main
```

## หลัง Deploy

### 1. ทดสอบ API
```bash
# Health check
curl https://your-api-url.com/health

# Test login
curl -X POST https://your-api-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'
```

### 2. อัพเดท Flutter App
แก้ไข API URL ใน Flutter app:
```dart
// ใน config file
const String API_BASE_URL = 'https://your-api-url.com';
```

### 3. ตรวจสอบ CORS
ตั้งค่า CORS_ORIGIN ให้ตรงกับ domain ของ Flutter app

## Environment Variables ที่จำเป็น

```env
NODE_ENV=production
PORT=10000
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASS=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_super_secret_key
BCRYPT_ROUNDS=12
CORS_ORIGIN=*
```

## Troubleshooting

### Database Connection Issues
1. ตรวจสอบ DB credentials
2. ตรวจสอบ firewall/security groups
3. ตรวจสอบ SSL requirements

### CORS Issues
1. ตั้งค่า CORS_ORIGIN ให้ถูกต้อง
2. ตรวจสอบ preflight requests

### Performance Issues
1. เพิ่ม database indexes
2. ใช้ connection pooling
3. เพิ่ม caching

## การ Monitor

### Logs
```bash
# Render
render logs

# Heroku  
heroku logs --tail

# Railway
railway logs
```

### Health Check
- URL: `https://your-api-url.com/health`
- ควรได้ response พร้อม uptime และ endpoints list