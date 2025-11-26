const axios = require('axios');

async function testAPI() {
    try {
        // First login
        const loginRes = await axios.post('http://localhost:5000/api/auth/passenger/login', {
            irctcId: 'IR_8001',
            pnr: '1000000001'
        });

        console.log('Login successful:', loginRes.data);
        const token = loginRes.data.token;

        // Then fetch passenger data
        const passengerRes = await axios.get('http://localhost:5000/api/passengers/by-irctc/IR_8001', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('\n=== PASSENGER DATA FROM API ===');
        console.log(JSON.stringify(passengerRes.data.data, null, 2));

        console.log('\n=== KEY FIELDS ===');
        const p = passengerRes.data.data;
        console.log('Train_Number:', p.Train_Number);
        console.log('Train_Name:', p.Train_Name);
        console.log('Booking_Date:', p.Booking_Date);
        console.log('Assigned_Coach:', p.Assigned_Coach);
        console.log('Assigned_Seat:', p.Assigned_Seat);
        console.log('Boarding_station:', p.Boarding_station);
        console.log('Deboarding_station:', p.Deboarding_station);

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testAPI();
