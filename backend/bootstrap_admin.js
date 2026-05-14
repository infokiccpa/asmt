const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function bootstrap() {
    const data = {
        name: 'Super Admin',
        email: 'superadmin@clarity.com',
        password: 'SuperAdminPassword123!',
        secret: process.env.BOOTSTRAP_SECRET
    };

    try {
        const response = await axios.post('http://localhost:5000/api/auth/bootstrap-super-admin', data);
        console.log('✅ Super Admin created successfully!');
        console.log('-----------------------------------');
        console.log(`Email: ${data.email}`);
        console.log(`Password: ${data.password}`);
        console.log('-----------------------------------');
    } catch (error) {
        if (error.response) {
            console.error('❌ Bootstrap failed:', error.response.data.message);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

bootstrap();
