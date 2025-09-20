# Admin Reset System Documentation

## 📁 ไฟล์ที่เกี่ยวข้อง

### 🔧 ไฟล์หลัก (Production)
- `controllers/admin.js` - API endpoint `/api/admin/reset`
- `middleware/auth.js` - Authentication และ authorization
- `utils/businessLogicValidator.js` - System validation

### 🧪 ไฟล์ทดสอบ (Testing)
- `working_reset_test.js` - โค้ดแม่แบบที่ทำงานได้ 100%
- `test_api_reset.js` - ทดสอบ API endpoint
- `README_RESET_SYSTEM.md` - เอกสารนี้

## 🚀 วิธีใช้งาน

### 1. เริ่มเซิร์ฟเวอร์
```bash
npm start
```

### 2. ทดสอบระบบ
```bash
# ทดสอบโค้ดแม่แบบ (Direct Database)
node working_reset_test.js

# ทดสอบ API endpoint
node test_api_reset.js
```

### 3. ใช้งานจริงจาก Flutter App
- เรียก `POST /api/admin/reset` พร้อม admin token
- ดู log ในเซิร์ฟเวอร์เพื่อติดตามการทำงาน

## 📊 ผลลัพธ์ที่คาดหวัง

### ✅ เมื่อสำเร็จ
```json
{
  "success": true,
  "message": "รีเซ็ทระบบเรียบร้อย ลบข้อมูลทั้งหมด เหลือเฉพาะ admin: admin",
  "data": {
    "deletedPurchases": 0,
    "deletedPrizes": 0,
    "deletedTickets": 120,
    "deletedUsers": 0,
    "adminPreserved": "admin"
  }
}
```

### 📋 Server Logs
```
🔐 ADMIN AUTH: User: admin Role: admin IsAdmin: true
🔄 ADMIN RESET: Starting system reset...
✅ ADMIN RESET: Deleted 120 tickets
🎉 ADMIN RESET: Reset completed successfully!
POST /api/admin/reset - 200 (831ms)
```

## 🔍 การแก้ปัญหา

### ❌ ถ้าไม่มี log ในเซิร์ฟเวอร์
- ตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่
- ตรวจสอบ URL และ port ใน Flutter app
- ตรวจสอบ network connection

### ❌ ถ้ามี Authentication Error
- ตรวจสอบ admin token
- ตรวจสอบ user role ในฐานข้อมูล
- ใช้ `test_api_reset.js` เพื่อทดสอบ authentication

### ❌ ถ้ามี Database Error
- ตรวจสอบการเชื่อมต่อฐานข้อมูล
- ตรวจสอบ table structure
- ใช้ `working_reset_test.js` เพื่อทดสอบ database operations

## 🔧 โครงสร้างโค้ด

### API Controller (`controllers/admin.js`)
```javascript
router.post('/reset', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // ใช้โค้ดเดียวกันกับ working_reset_test.js
  // มี detailed logging ทุกขั้นตอน
  // Error handling ครบถ้วน
}));
```

### Working Test (`working_reset_test.js`)
```javascript
async function workingResetFunction() {
  // โค้ดแม่แบบที่ทำงานได้ 100%
  // ใช้เป็น reference สำหรับ API controller
  // มี validation และ error handling
}
```

## 📝 หมายเหตุ

1. **ไม่ลบไฟล์ test** - เก็บไว้เป็น reference
2. **API ใช้โค้ดเดียวกันกับ test** - รับประกันการทำงาน
3. **มี detailed logging** - ง่ายต่อการ debug
4. **Support authentication** - ปลอดภัยสำหรับ production

## 🎯 การพัฒนาต่อ

หากต้องการแก้ไขระบบรีเซ็ท:
1. แก้ไขใน `working_reset_test.js` ก่อน
2. ทดสอบให้แน่ใจว่าทำงานได้
3. คัดลอกโค้ดไปใช้ใน `controllers/admin.js`
4. ทดสอบ API ด้วย `test_api_reset.js`

---
**สร้างเมื่อ:** วันที่ระบบรีเซ็ททำงานได้สำเร็จ  
**อัปเดตล่าสุด:** เมื่อนำโค้ด working test มาใช้ใน API