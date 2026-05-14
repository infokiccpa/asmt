const testRegister = async () => {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        role: 'Student'
      })
    });
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Fetch Error:', error.message);
  }
};

testRegister();
