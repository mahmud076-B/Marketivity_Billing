async function main() {
  const token = 'admin_setup_eb3def95a259293dacdf4b67e1ca58e2';
  
  const payload = {
    email: "mahmudjoy989@gmail.com",
    password: "Mahmud(3314)",
    name: "Mahmud Hasan Joy"
  };

  try {
    const res = await fetch('http://localhost:8080/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'invite_token=' + token,
        'Origin': 'http://localhost:8080'
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json().catch(() => null);
    console.log("Status:", res.status);
    console.log("Body:", body);
  } catch(e) {
    console.error(e);
  }
}

main();
