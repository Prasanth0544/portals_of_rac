/**
 * test-email.ts
 * Quick test to verify email configuration works
 */

import dotenv from 'dotenv';

dotenv.config();

const NotificationService = require('./services/NotificationService');

console.log('📧 Testing Email Configuration...\n');

// Check if credentials are loaded
console.log('Email User:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('Email Password:', process.env.EMAIL_PASSWORD ? '✓ Set' : '❌ NOT SET');
console.log('');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email credentials not found in .env file!');
    console.log('\nAdd to backend/.env:');
    console.log('EMAIL_USER=your.email@gmail.com');
    console.log('EMAIL_PASSWORD=your_app_password');
    process.exit(1);
}

interface TestPassenger {
    name: string;
    email: string;
    mobile: string;
    pnr: string;
    coach: string;
    berth: string;
}

// Create a test passenger
const testPassenger: TestPassenger = {
    name: 'Test Passenger',
    email: 'prasanthgannavarapu12@gmail.com',
    mobile: '+1234567890',
    pnr: 'TEST123456',
    coach: 'S1',
    berth: '45'
};

console.log('Sending test email to:', testPassenger.email);
console.log('From:', process.env.EMAIL_USER);
console.log('');

// Send test email
NotificationService.sendNoShowMarkedNotification('TEST123456', testPassenger)
    .then((result: any) => {
        console.log('\n✅ EMAIL TEST SUCCESSFUL!');
        console.log('Result:', result);
        console.log('\nCheck inbox of:', testPassenger.email);
        process.exit(0);
    })
    .catch((error: Error) => {
        console.error('\n❌ EMAIL TEST FAILED!');
        console.error('Error:', error.message);
        console.log('\nCommon fixes:');
        console.log('1. Check app password is correct (16 chars from Google)');
        console.log('2. Verify 2FA is enabled on Gmail account');
        console.log('3. Try generating a new app password');
        process.exit(1);
    });
