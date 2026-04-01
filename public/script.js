// ========================
// SAVE CONTACT
// ========================
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
    console.log("SAVE RESPONSE:", data);

    if (res.ok) {
      alert("✅ Contact saved !");

      // 🔥 reload dashboard SANS casser le save
      try {
        await load();
      } catch (err) {
        console.warn("Load failed (non critique):", err);
      }

    } else {
      alert("❌ Error saving contact");
    }

  } catch (err) {
    console.error("SAVE ERROR:", err);
    alert("🚨 Server error");
  }
}


// ========================
// LOAD DASHBOARD
// ========================
async function load(){
  try {
    const res = await fetch('/api/stats');

    if(!res.ok){
      throw new Error("Stats API failed");
    }

    const data = await res.json();
    console.log("STATS:", data);

    let total = data.total || 0;
    let remaining = 500 - total;
    let percent = Math.min((total / 500) * 100, 100);

    // ========================
    // PROGRESS BAR
    // ========================
    const bar = document.getElementById('bar');
    if(bar) bar.style.width = percent + "%";

    // ========================
    // TEXT STATS
    // ========================
    const saved = document.getElementById('saved');
    const remainingEl = document.getElementById('remaining');

    if(saved) saved.innerText = total + " / 500";
    if(remainingEl) remainingEl.innerText = remaining + " remaining";

    // ========================
    // DASHBOARD TEXT
    // ========================
    const dash = document.getElementById('dash');
    if(dash){
      dash.innerText = `Saved: ${total} | Remaining: ${remaining} | Progress: ${percent.toFixed(1)}%`;
    }

    // ========================
    // LAST ACTIVITIES
    // ========================
    const latestDiv = document.getElementById('latest');
    if(latestDiv){
      latestDiv.innerHTML = "";

      (data.latest || []).forEach(item => {
        let d = document.createElement("div");
        d.className = "dashboard-item";
        d.innerText = item.phone || "hidden";
        latestDiv.appendChild(d);
      });
    }

  } catch (err) {
    console.error("LOAD ERROR:", err);
  }
}


// ========================
// AUTO LOAD ON START
// ========================
document.addEventListener("DOMContentLoaded", () => {
  load();
});