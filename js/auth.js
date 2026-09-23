async function hashPassword(password){
	const enc = new TextEncoder().encode(password);
	const buf = await crypto.subtle.digest("SHA-256", enc);
	return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getUsers(){
	return JSON.parse(localStorage.getItem("vivantUsers") || "{}");
}

function saveUsers(users){
	localStorage.setItem("vivantUsers", JSON.stringify(users));
}

function currentUser(){
	return localStorage.getItem("vivantSession");
}

function currentUserBranding(){
	const username = currentUser();
	if(!username) return null;
	const users = getUsers();
	const user = users[username];
	if(!user) return null;
	return {
		logo: user.logo || null,
		stamp: user.stamp || null,
		trn: user.trn || null,
		address: user.address || null,
		phone: user.phone || null,
		email: user.email || null
	};
}

function fileToDataURL(file){
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(new Error("Could not read file"));
		reader.readAsDataURL(file);
	});
}

function requireAuth(){
	if(!currentUser()){
		window.location.href = "login.html";
	}
}

function logout(){
	localStorage.removeItem("vivantSession");
	window.location.href = "login.html";
}

function showAuthMsg(text, isError){
	const msg = document.getElementById("authMsg");
	msg.textContent = text;
	msg.className = "authMsg " + (isError ? "error" : "success");
}

async function handleRegister(event){
	event.preventDefault();

	const username = regUsername.value.trim();
	const password = regPassword.value;
	const confirmPassword = regConfirm.value;
	const trn = regTRN.value.trim();
	const address = regAddress.value.trim();
	const phone = regPhone.value.trim();
	const email = regEmail.value.trim();
	const logoFile = regLogo.files[0];
	const stampFile = regStamp.files[0];
	const MAX_SIZE = 2 * 1024 * 1024; 

	if(!username || !password){
		showAuthMsg("Please fill in all fields.", true);
		return;
	}
	if(password !== confirmPassword){
		showAuthMsg("Passwords do not match.", true);
		return;
	}
	if(password.length < 4){
		showAuthMsg("Password must be at least 4 characters.", true);
		return;
	}
	if(!/^\d{15}$/.test(trn)){
		showAuthMsg("TRN must be exactly 15 digits.", true);
		return;
	}
	if(!address || !phone || !email){
		showAuthMsg("Please fill in your company address, phone, and email.", true);
		return;
	}
	if(!logoFile || !stampFile){
		showAuthMsg("Please upload both your logo and your stamp.", true);
		return;
	}
	if(logoFile.size > MAX_SIZE || stampFile.size > MAX_SIZE){
		showAuthMsg("Please use images under 2MB each.", true);
		return;
	}

	const users = getUsers();
	if(users[username]){
		showAuthMsg("That username is already taken.", true);
		return;
	}

	const [passwordHash, logoData, stampData] = await Promise.all([
		hashPassword(password),
		fileToDataURL(logoFile),
		fileToDataURL(stampFile)
	]);

	users[username] = {
		password: passwordHash,
		logo: logoData,
		stamp: stampData,
		trn: trn,
		address: address,
		phone: phone,
		email: email
	};
	saveUsers(users);

	showAuthMsg("Account created! Redirecting to login...", false);
	setTimeout(() => { window.location.href = "login.html"; }, 1200);
}

async function handleLogin(event){
	event.preventDefault();

	const username = loginUsername.value.trim();
	const password = loginPassword.value;
	const users = getUsers();

	if(!users[username]){
		showAuthMsg("No account found with that username.", true);
		return;
	}

	const hashed = await hashPassword(password);
	if(users[username].password !== hashed){
		showAuthMsg("Incorrect password.", true);
		return;
	}

	localStorage.setItem("vivantSession", username);
	window.location.href = "home.html";
}
