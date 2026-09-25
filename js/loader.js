function initLoader() {
	setTimeout(() => {
		document.body.classList.add("fade-out");

		firebase.auth().onAuthStateChanged(user => {
			setTimeout(() => {
				window.location.href = user ? "pages/home.html" : "pages/auth.html";
			}, 500);
		});
	}, 1800);
}

initLoader();
