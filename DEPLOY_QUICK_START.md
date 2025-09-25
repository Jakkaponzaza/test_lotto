# 🚀 Quick Deploy Guide

## ขั้นตอนการ Deploy แบบเร็ว

### 1. ตรวจสอบความพร้อม
```bash
npm run validate
```

### 2. Push ไป GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 3. Deploy บน Render.com

#### วิธีที่ 1: ใช้ render.yaml (แนะนำ)
1. ไป [render.com](https://render.com)
2. เชื่อมต่อ GitHub repository
3. เลือก "lotto-api" folder
4. Render จะอ่าน `render.yaml` อัตโนมัติ
5. ตั้งค่า environment variables ที่จำเป็น
6. Deploy!

#### วิธีที่ 2: Manual Setup
1. สร้าง Web Service ใหม่
2. เชื่อมต่อ GitHub repository
3. ตั้งค่า:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Plan**: Free

### 4. ตั้งค่า Environment Variables
```
NODE_ENV=production
PORT=10000
DB_HOST=202.28.34.203
DB_PORT=3306
DB_USER=mb68_65011212115
DB_PASS=g0bPZ$Cib3i9
DB_NAME=mb68_65011212115
JWT_SECRET=your_super_secret_key_here
BCRYPT_ROUNDS=12
CORS_ORIGIN=*
```

### 5. ทดสอบ API
หลัง deploy เสร็จ ทดสอบ:
```bash
# Health check
curl https://your-app-name.onrender.com/health

# Login test
curl -X POST https://your-app-name.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'
```

### 6. อัพเดท Flutter App
แก้ไข `config.production.json`:
```json
{
  "api": {
    "host": "your-app-name.onrender.com",
    "port": 443,
    "protocol": "https"
  }
}
```

## 🎯 URLs หลัง Deploy

- **API Base**: `https://your-app-name.onrender.com`
- **Health Check**: `https://your-app-name.onrender.com/health`
- **Login**: `https://your-app-name.onrender.com/api/auth/login`
- **Register**: `https://your-app-name.onrender.com/api/register`

## 🔧 Troubleshooting

### ถ้า Deploy ไม่สำเร็จ
1. ตรวจสอบ logs ใน Render dashboard
2. ตรวจสอบ environment variables
3. ตรวจสอบ database connection

### ถ้า API ไม่ทำงาน
1. ตรวจสอบ `/health` endpoint
2. ตรวจสอบ database connection
3. ตรวจสอบ CORS settings

### ถ้า Flutter app เชื่อมต่อไม่ได้
1. ตรวจสอบ API URL ใน config
2. ตรวจสอบ CORS_ORIGIN setting
3. ตรวจสอบ network connectivity

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ logs
2. ทดสอบ API endpoints
3. ตรวจสอบ database connection
4. ตรวจสอบ environment variables

---

**หมายเหตุ**: ใช้เวลาประมาณ 5-10 นาทีในการ deploy ครั้งแรก