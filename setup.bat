@echo off
echo Setting up Rapid Response project...

REM Set execution policy to allow npm to run
echo Setting execution policy...
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"

REM Install frontend dependencies
echo Installing frontend dependencies...
npm install

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
npm install
cd ..

echo Setup complete!
echo Next steps:
echo 1. Copy backend/env.example to backend/.env and configure your database
echo 2. Set up your Firebase project for authentication
echo 3. Run 'npm run backend:dev' to start the backend
echo 4. Run 'npm run android' or 'npm run ios' to start the frontend

pause 