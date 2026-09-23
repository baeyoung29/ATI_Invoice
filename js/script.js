let lastInvoice = parseInt(localStorage.getItem("atiInvoice")) || 1;
document.getElementById("invNo").value = lastInvoice;

if (!invDate.value) {
	invDate.value = new Date().toISOString().split("T")[0];
}

function formatMoney(n) {
	return (n || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sanitizePhone(input) {
	const cleaned = input.value.replace(/[^0-9+\-\s()]/g, "");
	if (cleaned !== input.value) {
		input.value = cleaned;
	}
}

function printInvoice() {
	if (!custName.value.trim()) {
		alert("Please enter a customer name before printing.");
		custName.focus();
		return;
	}

	if (document.querySelectorAll(".itemRow").length === 0) {
		alert("Please add at least one item before printing.");
		return;
	}

	let current = parseInt(invNo.value) || 1;
	localStorage.setItem("atiInvoice", current + 1);
	window.print();
}

function addItem() {
	let div = document.createElement("div");
	div.className = "itemRow";

	div.innerHTML = `
		<textarea class="desc" placeholder="Description" oninput="updateInvoice()"></textarea>
		<input type="number" class="qty" value="1" oninput="updateInvoice()">
		<input type="number" class="price" placeholder="Unit Price Incl VAT" oninput="updateInvoice()">
		<button onclick="removeItem(this)">Remove</button>
	`;

	document.getElementById("itemList").appendChild(div);
}

function removeItem(btn) {
	btn.parentElement.remove();
	updateInvoice();
}

function addPayment() {
	let div = document.createElement("div");
	div.className = "paymentRow";

	div.innerHTML = `
		<select class="payMode" onchange="updateInvoice()">
			<option>CASH</option>
			<option>CARD</option>
			<option>BANK TRANSFER</option>
			<option>CHEQUE</option>
		</select>
		<input type="text" class="payRef" placeholder="Reference" oninput="updateInvoice()">
		<input type="number" class="payAmount" placeholder="Amount" oninput="updateInvoice()">
		<button onclick="removePayment(this)">Remove</button>
	`;

	document.getElementById("paymentList").appendChild(div);
}

function removePayment(btn) {
	btn.parentElement.remove();
	updateInvoice();
}

function numberToWords(num) {
	const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
		"Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
	const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

	function convertHundreds(n) {
		let str = "";
		if (n > 99) { str += ones[Math.floor(n / 100)] + " Hundred "; n %= 100; }
		if (n > 19) { str += tens[Math.floor(n / 10)] + " "; n %= 10; }
		if (n > 0) { str += ones[n] + " "; }
		return str;
	}

	function convertNumber(n) {
		let result = "";

		let billions = Math.floor(n / 1000000000);
		let millions = Math.floor((n % 1000000000) / 1000000);
		let thousands = Math.floor((n % 1000000) / 1000);
		let hundreds = n % 1000;

		if (billions) result += convertHundreds(billions) + " Billion ";
		if (millions) result += convertHundreds(millions) + " Million ";
		if (thousands) result += convertHundreds(thousands) + " Thousand ";
		if (hundreds) result += convertHundreds(hundreds);

		return result.trim();
	}

	let integer = Math.floor(num);
	let decimal = Math.round((num - integer) * 100);

	let words = (convertNumber(integer) || "Zero") + " Dirhams";

	if (decimal > 0) {
		words += " and " + convertNumber(decimal) + " Fils";
	}

	return (words + " Only").replace(/\s+/g, " ").trim();
}

function updateInvoice() {
	let invNumber = parseInt(invNo.value) || 1;

	pInvNo.innerText = "INV-" + String(invNumber).padStart(4, "0");
	pDate.innerText = invDate.value;

	pName.innerText = custName.value;
	pAddress.innerText = custAddress.value;
	pPhone.innerText = custPhone.value;
	pTRN.innerText = custTRN.value;

	let tbody = document.getElementById("invoiceItems");
	tbody.innerHTML = "";

	let subtotal = 0;
	let vatTotal = 0;

	document.querySelectorAll(".itemRow").forEach((row, i) => {
		let desc = row.querySelector(".desc").value;
		let qty = parseFloat(row.querySelector(".qty").value) || 0;
		let price = parseFloat(row.querySelector(".price").value) || 0;

		let unitExcl = price / 1.05;
		let taxable = unitExcl * qty;
		let vat = taxable * 0.05;
		let total = taxable + vat;

		subtotal += taxable;
		vatTotal += vat;

		let tr = document.createElement("tr");
		tr.innerHTML = `
			<td>#${i + 1}</td>
			<td class="desc">${desc.replace(/</g, "&lt;")}</td>
			<td>${qty}</td>
			<td>AED ${formatMoney(price)}</td>
			<td>AED ${formatMoney(unitExcl)}</td>
			<td>AED ${formatMoney(taxable)}</td>
			<td>5%</td>
			<td>AED ${formatMoney(vat)}</td>
			<td>AED ${formatMoney(total)}</td>
		`;

		tbody.appendChild(tr);
	});

	let grand = subtotal + vatTotal;

	grandTotal.innerText = formatMoney(grand);
	pWords.innerText = numberToWords(grand);

	let paymentBody = document.getElementById("paymentRows");
	paymentBody.innerHTML = "";

	let paidTotal = 0;

	document.querySelectorAll(".paymentRow").forEach(row => {
		let mode = row.querySelector(".payMode").value;
		let ref = row.querySelector(".payRef").value || "-";
		let amount = parseFloat(row.querySelector(".payAmount").value) || 0;

		paidTotal += amount;

		let taxable = amount / 1.05;
		let vat = taxable * 0.05;

		let tr = document.createElement("tr");
		tr.innerHTML = `
			<td>${mode}</td>
			<td>${ref.replace(/</g, "&lt;")}</td>
			<td>AED</td>
			<td>AED ${formatMoney(taxable)}</td>
			<td>AED ${formatMoney(vat)}</td>
			<td>AED ${formatMoney(amount)}</td>
		`;

		paymentBody.appendChild(tr);
	});

	let balanceEl = document.getElementById("balanceDue");
	if (balanceEl) {
		let balance = grand - paidTotal;
		balanceEl.innerText = formatMoney(balance);
		balanceEl.style.color = balance > 0.01 ? "#b00000" : "#1a7a1a";
	}
}

updateInvoice();
