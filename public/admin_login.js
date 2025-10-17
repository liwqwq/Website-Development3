document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("login-message");

  msg.textContent = "";

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      msg.style.color = "green";
      msg.textContent = "Login successful! Redirecting...";
      setTimeout(() => {
        window.location.href = "/admin.html"; 
      }, 1000);
    } else {
      msg.style.color = "red";
      msg.textContent = data.error || "Login failed";
    }
  } catch (err) {
    msg.style.color = "red";
    msg.textContent = "Server connection error.";
  }
});
