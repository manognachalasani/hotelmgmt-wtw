# Quick Start Guide

## ✅ Pre-flight Checklist

Your project is **READY TO RUN**! Here's what's already set up:

- ✅ Backend dependencies installed
- ✅ Frontend dependencies installed  
- ✅ Backend code compiled (dist folder exists)
- ✅ Frontend code built (build folder exists)
- ✅ All API integrations complete
- ✅ All components implemented

## 🚀 Running the Project (2 Simple Steps)

### Step 1: Start the Backend Server

Open Terminal 1 and run:

```bash
cd /Users/anushkamohanty/Downloads/wtw4/hotelmgmt-wtw
npm run dev
```

You should see:
```
🏨 Hotel Booking System API
🚀 Server running on port 4000
```

### Step 2: Start the Frontend

Open Terminal 2 and run:

```bash
cd /Users/anushkamohanty/Downloads/wtw4/hotelmgmt-wtw/frontend
npm start
```

The browser will automatically open to `http://localhost:3000`

## 🎯 What You Can Do Now

1. **Browse Rooms**: View all available rooms on the homepage
2. **Check Availability**: Select dates and room type to see available rooms
3. **Register/Login**: 
   - Create a new account, OR
   - Use test credentials:
     - Admin: `admin@hotel.com` / `admin123`
     - Staff: `staff@hotel.com` / `staff123`
4. **Book a Room**: Click "Book This Room" on any room card
5. **View Bookings**: See your bookings in the "My Bookings" sidebar
6. **Cancel Bookings**: Cancel confirmed bookings directly from the dashboard

## 📋 Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hotel.com | admin123 |
| Staff | staff@hotel.com | staff123 |
| Guest | (Register new) | (Your choice) |

## 🔍 Verify Everything Works

1. **Backend Health Check**: Visit `http://localhost:4000/health`
   - Should return: `{"success":true,"message":"Hotel Booking API is running"}`

2. **API Info**: Visit `http://localhost:4000/api-info`
   - Should show all available endpoints

3. **Frontend**: Should load at `http://localhost:3000`
   - Should show room listings
   - Should have working navigation

## ⚠️ Troubleshooting

**If backend won't start:**
```bash
# Rebuild if needed
npm run build
# Then start
npm run dev
```

**If frontend won't start:**
```bash
cd frontend
# Clear cache and reinstall if needed
rm -rf node_modules package-lock.json
npm install
npm start
```

**If API calls fail:**
- Make sure backend is running on port 4000
- Check browser console for errors
- Verify CORS is enabled (it is by default)

## 📝 Notes

- **Email**: Email service works in simulation mode. No real emails will be sent unless you configure Gmail credentials in `.env`
- **Database**: Uses in-memory database. Data resets when server restarts.
- **Ports**: Backend uses 4000, Frontend uses 3000. Make sure these ports are free.

## 🎉 You're All Set!

The project is fully functional and ready to use. All features from the problem statement are implemented and working.

