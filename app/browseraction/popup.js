window.onload = function () {
	var allButton = document.querySelectorAll('.modal-icons button');

	// добавляем события к кнопка для вывода описания
	for (var i = 0; i < allButton.length; i++) {
		allButton[i].addEventListener('mouseover', function () {
			document.querySelector('.message-line').innerHTML = this.getAttribute('attr-title');
		});
		allButton[i].addEventListener('mouseout', function () {
			document.querySelector('.message-line').innerHTML = '';
		});
	}

	// нажатие на основную кнопку переноса задач
	document.querySelector('.transfer-tasks').addEventListener('click', function () {
		chrome.extension.sendMessage({
				type: "task-transfer"
		});
	});

	// нажатие на копировать отчет в буфер обмена
	document.querySelector('.copy-report').addEventListener('click', function () {
		chrome.extension.sendMessage({
				type: "generated-report"
		});
	});

	document.getElementById('check-toggle').addEventListener('click', function() {
		console.log(this.closest('.modal-option').querySelector('#check-consultant').checked);
		chrome.storage.sync.set({
			toggle: {
				switch: this.checked,
				flags: this.closest('.modal-option').querySelector('#flags-only').checked,
				consultant: this.closest('.modal-option').querySelector('#check-consultant').checked
			}
		}, function() {
			// перезагрузка страницы
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				chrome.tabs.reload(tabs[0].id);
			});
		});
	});

	document.getElementById('flags-only').addEventListener('click', function() {
		chrome.storage.sync.set({
			toggle: {
				switch: this.closest('.modal-option').querySelector('#check-toggle').checked,
				flags: this.checked,
				consultant: this.closest('.modal-option').querySelector('#check-consultant').checked
			}
		}, function() {
			// перезагрузка страницы
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				chrome.tabs.reload(tabs[0].id);
			});
		});
	});

	document.getElementById('check-consultant').addEventListener('click', function() {
		chrome.storage.sync.set({
			toggle: {
				switch: this.closest('.modal-option').querySelector('#check-toggle').checked,
				flags: this.closest('.modal-option').querySelector('#flags-only').checked,
				consultant: this.checked
			}
		}, function() {
			// перезагрузка страницы
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				chrome.tabs.reload(tabs[0].id);
			});
		});
	});
};

// управление чекбоксами
chrome.storage.sync.get(['toggle'], function(result) {
	if(result.toggle !== undefined) {
		if(result.toggle.switch) document.getElementById('check-toggle').setAttribute('checked', 'true');
		if(result.toggle.flags) document.getElementById('flags-only').setAttribute('checked', 'true');
		if(result.toggle.consultant) document.getElementById('check-consultant').setAttribute('checked', 'true');
	}
});