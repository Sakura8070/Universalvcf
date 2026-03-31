let token = '';

async function login() {
  const res = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({
      username: username.value,
      password: password.value
    })
  });

  const data = await res.json();
  token = data.token;
  load();
}

async function load() {
  const res = await fetch('/api/admin', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();

  new Chart(document.getElementById('chart'), {
    type: 'bar',
    data: {
      labels: data.countries.map(c => c._id),
      datasets: [{
        data: data.countries.map(c => c.count)
      }]
    }
  });
}

function downloadVCF() {
  window.location.href = '/api/vcf';
}