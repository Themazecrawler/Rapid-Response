# Troubleshooting Guide

## PowerShell Execution Policy Issues

If you encounter the error "File cannot be loaded. The file cannot be digitally signed", follow these steps:

### Option 1: Run the setup script
```bash
# Run the PowerShell script
.\setup.ps1

# Or run the batch file
.\setup.bat
```

### Option 2: Manual fix
1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Type 'Y' to confirm
4. Try running `npm install` again

### Option 3: Use Command Prompt
1. Open Command Prompt (cmd)
2. Navigate to your project directory
3. Run: `npm install`

## Common Issues and Solutions

### 1. Node.js not found
**Error**: `'node' is not recognized as an internal or external command`
**Solution**: 
- Download and install Node.js from https://nodejs.org/
- Make sure to check "Add to PATH" during installation
- Restart your terminal after installation

### 2. React Native CLI not found
**Error**: `'react-native' is not recognized`
**Solution**:
```bash
npm install -g @react-native-community/cli
```

### 3. Metro bundler issues
**Error**: Metro bundler fails to start
**Solution**:
```bash
# Clear Metro cache
npx react-native start --reset-cache
```

### 4. Android build issues
**Error**: Android build fails
**Solution**:
- Make sure Android Studio is installed
- Set up ANDROID_HOME environment variable
- Install Android SDK
- Create an Android Virtual Device (AVD)

### 5. iOS build issues
**Error**: iOS build fails
**Solution**:
- Make sure Xcode is installed (macOS only)
- Install CocoaPods: `sudo gem install cocoapods`
- Run: `cd ios && pod install`

### 6. Backend database connection issues
**Error**: Database connection fails
**Solution**:
1. Make sure PostgreSQL is installed and running
2. Create the database: `CREATE DATABASE rapid_response_db;`
3. Copy `backend/env.example` to `backend/.env`
4. Update the database credentials in `.env`

### 7. Firebase configuration issues
**Error**: Firebase authentication fails
**Solution**:
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password)
3. Download `google-services.json` for Android
4. Download `GoogleService-Info.plist` for iOS
5. Place them in the appropriate directories

## Environment Setup Checklist

### Prerequisites
- [ ] Node.js >= 18 installed
- [ ] React Native CLI installed
- [ ] Android Studio (for Android development)
- [ ] Xcode (for iOS development, macOS only)
- [ ] PostgreSQL database
- [ ] Firebase project

### Frontend Setup
- [ ] Dependencies installed (`npm install`)
- [ ] Firebase configuration added
- [ ] Android/iOS project configured

### Backend Setup
- [ ] Dependencies installed (`cd backend && npm install`)
- [ ] Environment file configured (`backend/.env`)
- [ ] Database created and accessible
- [ ] Server starts without errors

## Getting Help

If you're still experiencing issues:

1. Check the console output for specific error messages
2. Search for the error message online
3. Check the React Native documentation
4. Create an issue in the project repository

## Useful Commands

```bash
# Clear all caches
npm start -- --reset-cache
cd android && ./gradlew clean && cd ..
cd ios && xcodebuild clean && cd ..

# Check React Native environment
npx react-native doctor

# Update dependencies
npm update

# Check for outdated packages
npm outdated
``` 