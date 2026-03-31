async function save() {
  await fetch('/api/contact', {
    method: 'POST',
    body: JSON.stringify({
      name: name.value,
      email: email.value,
      country: country.value,
      phone: phone.value
    })
  });

  alert("Saved!");
}