// вставка списка занчений в поля
function addValues(elem, arrVal) {
	var elemText = '';
	for(var i = 0; i < arrVal.length; i++) {
		elemText += i == arrVal.length-1 ? arrVal[i] : arrVal[i]+',\r\n';
	}
	elem.value = elemText;
}

function splitArray(text) {
	return text.replace(/\r?\n/g, '').split(',');
}

// сохраняем занчения из полей
function save_options() {
	var page = document.getElementById('main-page').value,
		task  = document.getElementById('task-page').value,
		ratingFormula = document.getElementById('rating-formula').value,
		service = document.getElementById('project-service').value,
		types = splitArray(document.getElementById('types-of-tasks').value),
		ban = splitArray(document.getElementById('not-tolerate').value),
		sorting = splitArray(document.getElementById('sorting').value),
		hotkeys = document.getElementById('hotkeys').value,
		main = document.getElementById('main-type-of-task').value,
		mean = document.getElementById('mean').value,
		exceptions = document.getElementById('exceptions').checked;
	chrome.storage.sync.set({
		key: {
			page: page,
			task: task,
			formula: ratingFormula,
			service: service,
			types: types,
			ban: ban,
			sorting: sorting,
			hotkeys: hotkeys,
			main: main,
			mean: mean,
			exceptions: exceptions
		}
	}, function() {
		var options = {
				type: 'basic',
				title: 'Настройки сохранены',
				message: 'Все внесёные изменения сохранены!',
				iconUrl: 'https://img.icons8.com/offices/160/000000/brutus.png'
			};
			chrome.notifications.create(options);
		var status = document.getElementById('status');
		status.textContent = 'Значения сохранены.';
		setTimeout(function() {
			status.textContent = '';
		}, 750);
	});
}

function addEvents(arrElem) {
	var elemTabId = '1';
	for(var i = 0; i < arrElem.length; i++) {
		arrElem[i].addEventListener('click', function() {
			elemTabId = this.getAttribute('tab-number');
			this.parentNode.querySelector('.active').classList.remove('active');
			this.classList.add('active');
			document.querySelector('.tabs-body .tabs-body-content.active').classList.remove('active');
			document.querySelector('[tab-content="' + elemTabId + '"]').classList.add('active');
		});
	}
}

function addTypeList(ListType, val) {
	var elem = document.getElementById('main-type-of-task'),
			arrElemOption = document.querySelectorAll('[name="main-type-of-task"] option'),
			option = document.createElement('option');

	if(arrElemOption.length !== 0) {
		val = elem.value;
		for(var j = 0; j < arrElemOption.length; j++) {
			arrElemOption[j].remove();
		}
	}
	for(var i = 0; i < ListType.length; i++) {
		if(Number(val) === i) {
			option.setAttribute('selected', 'true');
		}
		option.innerHTML = ListType[i];
		option.value = i;
		elem.appendChild(option);
		option = document.createElement('option');
	}
}

// вставка значений в поля их хранилища
chrome.storage.sync.get(['key'], function(result, checkSettings) {
	if(result.key !== undefined) {
		document.getElementById('main-page').value = result.key.page;
		document.getElementById('task-page').value = result.key.task;
		document.getElementById('rating-formula').value = result.key.formula;
		document.getElementById('project-service').value = result.key.service;
		addValues(document.getElementById('types-of-tasks'), result.key.types);
		addValues(document.getElementById('not-tolerate'), result.key.ban);
		addValues(document.getElementById('sorting'), result.key.sorting);
		document.getElementById('hotkeys').value = result.key.hotkeys;
		addTypeList(result.key.types, result.key.main);
		document.getElementById('mean').value = result.key.mean;
		if(result.key.exceptions) document.getElementById('exceptions').setAttribute('checked', 'true');
	}
});

document.getElementById('save').addEventListener('click', function() {
	save_options();
});

addEvents(document.querySelectorAll('.tabs-button'));

// инициализация редактора
chrome.storage.sync.get(['service'], function(result, checkSettings) {
	if(result.service !== undefined) {
		var lollectionJSON = JSON.stringify(JSON.parse(result.service.collection), null, 4),
				myCodeMirror = CodeMirror(document.getElementById('service-collection'), {
			value: lollectionJSON,
			mode:  "javascript",
			json: true,
			lineNumbers: true,
			tabMode: "indent",
			matchBrackets: true,
			lineWrapping: true,
			indentUnit: 4
		});

		// сравнить с текущей датой и предупрездать если данные устарели
		document.getElementById('data').innerHTML = result.service.date;
		document.getElementById('time').innerHTML = result.service.time;
		//console.log(result.service.collection);
	}
});

document.getElementById('types-of-tasks').addEventListener('change', function() {
	var ListType = splitArray(this.value);
	addTypeList(ListType, false);
});