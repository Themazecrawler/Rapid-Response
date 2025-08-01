# Rapid Response - Emergency Alert System

A React Native mobile application with a Node.js/Express backend for emergency alert management in educational institutions.

## Features

- **Emergency Alert System**: Send emergency alerts with location data
- **User Authentication**: Firebase-based authentication system
- **Real-time Notifications**: Instant alert notifications
- **Contact Management**: Emergency contact directory
- **Location Services**: GPS-based location tracking
- **Alert History**: Track and view past alerts

## Tech Stack

### Frontend (React Native)
- React Native 0.78.0
- TypeScript
- React Navigation 7
- Firebase Authentication
- AsyncStorage for local data
- Vector Icons

### Backend (Node.js/Express)
- Express.js
- TypeScript
- PostgreSQL database
- JWT authentication
- Rate limiting
- Helmet security
- CORS support

## Prerequisites

- Node.js >= 18
- React Native CLI
- PostgreSQL database
- Firebase project (for authentication)
- Android Studio / Xcode (for mobile development)

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd Rapid-Response
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Install backend dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Environment Setup

#### Backend Environment
Copy the example environment file and configure your database:
```bash
cd backend
cp env.example .env
```

Edit `.env` with your database credentials:
```env
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=rapid_response_db
DB_PASSWORD=your_db_password
DB_PORT=5432
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
NODE_ENV=development
```

#### Frontend Firebase Setup
1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Add your Firebase configuration to the app

### 5. Database Setup

Create the PostgreSQL database and run migrations:
```sql
CREATE DATABASE rapid_response_db;
```

The database schema is defined in the queries file. You may need to create the tables manually or use a migration tool.

## Running the Application

### Start the Backend
```bash
# Development mode
npm run backend:dev

# Production mode
npm run backend:start
```

### Start the Frontend
```bash
# Android
npm run android

# iOS
npm run ios
```

## Project Structure

```
Rapid-Response/
├── src/                    # React Native source code
│   ├── navigation/         # Navigation components
│   ├── screens/           # Screen components
│   └── services/          # API and Firebase services
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── db/           # Database queries
│   │   └── server.ts     # Main server file
│   └── package.json
├── android/               # Android-specific files
├── ios/                   # iOS-specific files
└── package.json           # Frontend dependencies
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Alerts
- `POST /api/alerts` - Create new alert
- `GET /api/alerts/recent` - Get recent alerts

### Contacts
- `GET /api/contacts` - Get available contacts
- `POST /api/contacts` - Create new contact
- `PATCH /api/contacts/:id/availability` - Update contact availability

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/alerts` - Get user's alert history

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet security headers
- CORS configuration
- Input validation

## Testing

```bash
# Frontend tests
npm test

# Backend tests (from backend directory)
cd backend
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For support, please contact the development team or create an issue in the repository.

## Recent Fixes

- Fixed duplicate App component in App.tsx
- Created missing backend dependencies and middleware
- Added proper TypeScript configurations
- Created missing React Native screens and services
- Fixed navigation structure
- Added comprehensive error handling
- Created environment configuration templates
