async function save() {
  const nameVal = document.getElementById('name').value;
  const emailVal = document.getElementById('email').value;
  const countryVal = document.getElementById('country').value;
  const phoneVal = document.getElementById('phone').value;

  if (!phoneVal) {
    alert("Enter phone number");
    return;
  }

  if (!countryVal) {
    alert("Select country");
    return;
  }

  const fullPhone = `+${countryVal}${phoneVal}`;

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: nameVal,
        email: emailVal,
        country: countryVal,
        phone: fullPhone
      })
    });

    const data = await res.json();

    console.log("RESPONSE:", data);

    if (res.ok) {
      alert("✅ Contact saved !");
      
      // 🔥 recharge dashboard
      if (typeof load === "function") {
        load();
      }

    } else {
      alert("❌ Error saving contact");
    }

  } catch (err) {
    console.error("FETCH ERROR:", err);
    alert("🚨 Server error");
  }
}
