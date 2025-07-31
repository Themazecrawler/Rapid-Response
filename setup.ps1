# Setup script for Rapid Response project
Write-Host "Setting up Rapid Response project..." -ForegroundColor Green

# Set execution policy to allow npm to run
Write-Host "Setting execution policy..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm install

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
cd backend
npm install
cd ..

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy backend/env.example to backend/.env and configure your database" -ForegroundColor White
Write-Host "2. Set up your Firebase project for authentication" -ForegroundColor White
Write-Host "3. Run 'npm run backend:dev' to start the backend" -ForegroundColor White
Write-Host "4. Run 'npm run android' or 'npm run ios' to start the frontend" -ForegroundColor White 