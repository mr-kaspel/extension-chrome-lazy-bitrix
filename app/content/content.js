console.log('%c - Plugin «Functioning»‎ script loaded ', 'background: #bada55; color: #222');
var settings = {},
		changeCounter = 0; // общ колличество итераций

	//console.log((d.getDate()+1) + '.' +  (d.getMonth()+1) + '.' + d.getFullYear() + ' 19:00:00')

// отслеживаем входящие сообщения
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
	switch(message.type) {
		case "sort":
			// выполняем сортировку
			// changeCounter делжен идти от обратного
			settings = message.settings;
			changeCounter = changeCounter === 0 ? taskCounting(settings).itaretia : changeCounter-1;
			taskTransfer(changeCounter, taskCounting(settings));
			break;
		case "generated-report":
			copyGeneratedReport(message.settings);
			break;
		case "contentsMain":
			// вывод содержимого для главной
			displayContentsMain(message.settings);
			break;
		case "contentsTask":
			// вывод содержиомго для страницы задачи
			displayContentsTask(message.settings);
			break;
		case "contentsService":
			dataCollection(message.settings);
			break;
	}
	settings = message.settings;
});

// отправка сообщения в background.js
window.addEventListener("load", function() {
		chrome.extension.sendMessage({
				type: "content", 
				data: {
						pathname: document.location.pathname,
						href: document.location.href
				}
		});
		//console.clear();
}, true);

function taskTransfer(changData, countObj) {
	// отправляем кол. оставшихся итераций
	chrome.extension.sendMessage({
		type: "itaretia",
		count: countObj.itaretia
	});
	if(changData === 0) return;

	console.log("Ничего пока не работает, но вот занчение счетчика, в контексте страницы: " + changData);

	/*
		идем с конца списка исключаю планируемые задачи
		проверяем на выходные дни
		проверяем на исключения из настроек
	*/
}

/*
	полечаем:
		общ. коллечество задач - кол планируемых
		кол. итераций, необходимых для переноса всех задач
*/
function taskCounting(settings) {
	var countObj = {
		plan: 0, // колличество задач в плане
		task: document.querySelectorAll('.main-grid-row.main-grid-row-body').length, // общее кол. задач - планируемые
		itaretia: 0 // необходимое кол. итераций для переноса задач на следующий день
	},
		obPlan = JSON.parse(getCookie('plannedTasks'));

	for (var key in obPlan) if(obPlan[key]['checkbox']) countObj.plan++;
	countObj.task = countObj.task - countObj.plan;
	countObj.itaretia = Math.ceil(countObj.task / settings.options.mean) + 1; // плюс одна итерация для переноса задач на следующий день
	return countObj;
}

// попируем список выделенных задач в буфер обмена
function copyGeneratedReport(settings) {
	var objPlan = JSON.parse(getCookie('plannedTasks')),
			listTasks = '',
			hostName = '',
			nameTask = '',
			typeTask = '',
			d = new Date();

	// создаем textarea для копирования в буфер обмена
	if(!isNaN(document.getElementById('list-tasks'))) document.getElementById('footer').insertAdjacentHTML('afterend', '<textarea id="list-tasks"></textarea>');
	for (var key in objPlan) {
		if(objPlan[key]['checkbox']) {
			typeTask = document.querySelector('[task-id="' + key + '"] option[value="' + document.querySelector('[task-id="' + key + '"]').value + '"]').innerHTML;
			nameTask = document.querySelector('[href $= "' + key + '/"]').innerHTML;
			hostName = document.querySelector('[href $= "' + key + '/"]').closest('.main-grid-row').querySelector('.tasks-list-crm-div-wrapper a');
			hostName = isNaN(hostName) ? hostName.innerHTML.split(' - ')[0] : 'Общая задача';

			listTasks += ((d.getDate()+1) + '.' + (d.getMonth()+1) + '.' + d.getFullYear()) + '\t\t\t' + hostName + '\t' + settings.options.formula + '\t' + nameTask + '\t\t' + typeTask + '\t00:00:00\n';
		}
	}
	var textArea = document.getElementById('list-tasks');
	textArea.value = listTasks;
	textArea.focus();
	textArea.select();

	try {
		document.execCommand('copy');
		chrome.extension.sendMessage({
			type: "buffered"
		});
	} catch (err) {
		chrome.extension.sendMessage({
			type: "buffered-error"
		});
	}
}

function getCookie(name) {
	let matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : undefined;
}

function setCookie(name, value, options = {}) {
	options = {
		path: '/',
	};

	let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

	for (let optionKey in options) {
	updatedCookie += "; " + optionKey;
		let optionValue = options[optionKey];
		if (optionValue !== true) {
			updatedCookie += "=" + optionValue;
		}
	}
	document.cookie = updatedCookie;
}

function saveTask(typeTarget, idTask, valType) {
	var plannedTasks = getCookie('plannedTasks');

	// если target checkbox
	if(typeTarget.indexOf('checkbox') !== -1) {
		// если cookies ещё пустые
		if(plannedTasks !== undefined) {
			var jsonTasks = JSON.parse(plannedTasks);
			// если значение уже есть в cookies, перезаписываем
			// нодо удалять значения равные false, но это потом!!!!!!!!!!!!!
			if(jsonTasks[idTask]) {
				jsonTasks[idTask][typeTarget] = valType;
				jsonTasks = JSON.stringify(jsonTasks);
				setCookie('plannedTasks', jsonTasks);
			} else {
				// если объекта неть, добавляем
				jsonTasks[idTask] = {
					id: idTask,
					checkbox: valType,
					select: document.querySelector('[task-id=\"' + idTask + '\"]').value
				};
				jsonTasks = JSON.stringify(jsonTasks);
				setCookie('plannedTasks', jsonTasks);
			}
		} else {
			var objTask = {};
			objTask[idTask] = {
				id: idTask,
				checkbox: valType,
				select: document.querySelector('[task-id=\"' + idTask + '\"]').value
			};
			objTask = JSON.stringify(objTask);
			//console.log(objTask);
			setCookie('plannedTasks', objTask);
		}
	}
	// если target selector
	if(typeTarget.indexOf('select') !== -1) {
		// если cookies ещё пустые
		if(plannedTasks !== undefined) {
			var jsonTasks = JSON.parse(plannedTasks);
			// если значение уже есть в cookies, перезаписываем
			// нодо удалять значения равные false, но это потом!!!!!!!!!!!!!
			if(jsonTasks[idTask]) {
				jsonTasks[idTask][typeTarget] = valType;
				jsonTasks = JSON.stringify(jsonTasks);
				setCookie('plannedTasks', jsonTasks);
			} else {
				// если объекта неть, добавляем
				jsonTasks[idTask] = {
					id: idTask,
					checkbox: document.querySelector('input[value=\"' + idTask + '\"]').checked,
					select: valType
				};
				jsonTasks = JSON.stringify(jsonTasks);
				setCookie('plannedTasks', jsonTasks);
			}
		} else {
			var objTask = {};
			objTask[idTask] = {
				id: idTask,
				checkbox: document.querySelector('[task-id=\"' + idTask + '\"]').checked,
				select: valType
			};
			objTask = JSON.stringify(objTask);
			//console.log(objTask);
			setCookie('plannedTasks', objTask);
		}
	}
	// выводить количество добавленных задач в план
	// и отправляем сообщение в background
	chrome.extension.sendMessage({
			type: "count", 
			data: displayValueTasks(JSON.parse(getCookie('plannedTasks')))
	});
}

function displayValueTasks(task) {
	var count = 0;
	for(var key in task) {
		if(task[key]['checkbox']) count++;
	}
	return count;
}

//onchange="alert(this.value)"
// вывод для главной страницы
function displayContentsMain(settings) {
	if(settings.toggle.switch) {
		var arrRowTask = document.querySelectorAll('.main-grid-row.main-grid-row-body');
		var elemCheckbox = ''; // чекбокс
		var elemId = ''; // идентификатор задачи
		var elemSelecot = ''; // селектор типа задач
		var saveTasks = getCookie('plannedTasks')!== undefined ? JSON.parse(getCookie('plannedTasks')) : '';
		var attrChecked = '';
		var attrSelect = '';
		var collection = settings.observice !== undefined ? JSON.parse(settings.observice.collection) : false;
		// добавляем заколовки в таблице со списком задач
		// проверяем отображать только флаги или нет
			if(!settings.toggle.flags) document.querySelector('.main-grid-cell-checkbox').insertAdjacentHTML('afterend','<th class="custom-title-row-table"></th><th class="custom-title-row-table"></th>');

		for(var i = 0; i < arrRowTask.length; i++) {
			var checkFlag = arrRowTask[i].querySelector('.tasks-list-crm-div-wrapper a');
			attrChecked = '';
			elemCheckbox = arrRowTask[i].querySelector('.main-grid-row-checkbox.main-grid-checkbox');
			elemId = elemCheckbox.value;

			// Добавляем флаги статусов времени пакетов, по каждому клиенту
			if(isNaN(checkFlag) && collection && collection[checkFlag.innerHTML.split(' - ')[0]] !== undefined) {
				var mBalance = collection[checkFlag.innerHTML.split(' - ')[0]]['current']['modernization'],
						kBalance = collection[checkFlag.innerHTML.split(' - ')[0]]['current']['content'],
						mBalanceP = collection[checkFlag.innerHTML.split(' - ')[0]]['past']['modernization'],
						kBalanceP = collection[checkFlag.innerHTML.split(' - ')[0]]['past']['content'];

				// проверяем наличие модернизации
				if(mBalance !== undefined && (mBalance[0] >= mBalance[1] ||  mBalance[1] === 0)) arrRowTask[i].querySelector('.task-title-indicators').insertAdjacentHTML('afterend', '<div title="' + mBalance[0] + '/' + mBalance[1] + '" class="flags-red"></div>');
				// проверяем наличие контента
				if(kBalance !== undefined && (kBalance[0] >= kBalance[1] ||  kBalance[1] === 0)) arrRowTask[i].querySelector('.task-title-indicators').insertAdjacentHTML('afterend', '<div title="' + kBalance[0] + '/' + kBalance[1] + '" class="flags-pink"></div>');

				// проверяем наличие переработки по модернизации за прошлый месяц
				if(mBalanceP !== undefined && (mBalanceP[0] > mBalanceP[1])) arrRowTask[i].querySelector('.task-title-indicators').insertAdjacentHTML('afterend', '<div title="' + mBalanceP[0] + '/' + mBalanceP[1] + '" class="flags-red-p"></div>');
				// проверяем наличие переработки по контенту за прошлый месяц
				if(kBalanceP !== undefined && (kBalanceP[0] > kBalanceP[1])) arrRowTask[i].querySelector('.task-title-indicators').insertAdjacentHTML('afterend', '<div title="' + kBalanceP[0] + '/' + kBalanceP[1] + '" class="flags-pink-p"></div>');
			}

			// проверяем отображать только флаги или нет
			if(!settings.toggle.flags) {
				elemSelecot = '<select task-id="' + elemId + '" class="types-task">';
				for(var j = 0; j < settings.options.types.length; j++) {
					attrSelect = '';
					if(saveTasks[elemId] !== undefined && Number(saveTasks[elemId]['select']) === j) {
						attrSelect = 'selected';
					} else if(Number(settings.options.main) === j) attrSelect = 'selected';
					elemSelecot += '<option ' + attrSelect + ' value="' + j + '">' + settings.options.types[j] + '</option>';
				}
				elemSelecot += '</select>';
				if(saveTasks[elemId] !== undefined && saveTasks[elemId]['checkbox']) attrChecked = 'checked="true"';
				// добавитм новый чекбокс
				arrRowTask[i].querySelector('.main-grid-cell-checkbox').insertAdjacentHTML('afterend', '<td class="column-plan"><input type="checkbox" value="' + elemId + '" class="in-terms-of" title="Добавить в план на следующий день" ' + attrChecked + '></td><td class="task-type-selector">' + elemSelecot + '</td>');

				// добавляем кривой обработчик для chekboxa и select
				arrRowTask[i].addEventListener('change', function(e) {
					if(e.target.className.indexOf('in-terms-of') !== -1) saveTask('checkbox', e.target.value, e.target.checked);
					if(e.target.className.indexOf('types-task') !== -1) saveTask('select', e.target.getAttribute('task-id'), e.target.value);
				});
			}
		}
	}
}

// вывод для страницы задач
function displayContentsTask(settings) {
	if(settings.toggle.switch) {
		var addTextTask = document.querySelector('.task-detail-subtitle-status'),
			elemId = addTextTask.innerText.replace(/\D+/g,""), // идентификатор задачи
			elemSelecot = '<select task-id="' + elemId + '" class="types-task">', // селектор типа задач
			saveTasks = getCookie('plannedTasks')!== undefined ? JSON.parse(getCookie('plannedTasks')) : '',
			attrChecked = '',
			attrSelect = '',
			checkFlag = document.querySelector('.field_crm_entity a'),
			collection = settings.observice !== undefined ? JSON.parse(settings.observice.collection) : false;

		// проверяем отображать только флаги или нет
		if(!settings.toggle.flags) {
			for(var i = 0; i < settings.options.types.length; i++) {
				attrSelect = '';
				if(saveTasks[elemId] !== undefined && Number(saveTasks[elemId]['select']) === i) {
					attrSelect = 'selected';
				} else if(Number(settings.options.main) === i ) {
					attrSelect = 'selected';
				}
				elemSelecot += '<option ' + attrSelect + ' value="' + i + '">' + settings.options.types[i] + '</option>';
			}
			elemSelecot += '</select>';
			if(saveTasks[elemId] !== undefined && collection && saveTasks[elemId]['checkbox']) attrChecked = 'checked="true"';
			addTextTask.insertAdjacentHTML('afterend', '<div class="selection-line"><label><b>Добавить в план на следующий день</b> <input type="checkbox" value="' + elemId + '" class="in-terms-of" title="Добавить в план на следующий день" ' + attrChecked + '></label> / <label><b>Тип задачи</b> ' + elemSelecot + '</label></div>');

			// добавляем кривой обработчик для chekboxa и select
			document.querySelector('.task-detail-header').addEventListener('change', function(e) {
				if(e.target.className.indexOf('in-terms-of') !== -1) saveTask('checkbox', e.target.value, e.target.checked);
				if(e.target.className.indexOf('types-task') !== -1) saveTask('select', e.target.getAttribute('task-id'), e.target.value);
			});
		}

		// Добавляем флаги статусов времени пакетов, по каждому клиенту
		if(isNaN(checkFlag) && collection[checkFlag.innerHTML.split(' - ')[0]] !== undefined) {
			var mBalance = collection[checkFlag.innerHTML.split(' - ')[0]]['current']['modernization'],
					kBalance = collection[checkFlag.innerHTML.split(' - ')[0]]['current']['content'],
					mBalanceP = collection[checkFlag.innerHTML.split(' - ')[0]]['past']['modernization'],
					kBalanceP = collection[checkFlag.innerHTML.split(' - ')[0]]['past']['content'];

			// проверяем наличие модернизации текущий месяц
			if(mBalance !== undefined && (mBalance[0] >= mBalance[1] ||  mBalance[1] === 0)) document.querySelector('.task-detail-subtitle-status').insertAdjacentHTML('afterend', '<div title="' + mBalance[0] + '/' + mBalance[1] + '" class="flags-red"></div>');
			// проверяем наличие контента
			if(kBalance !== undefined && (kBalance[0] >= kBalance[1] ||  kBalance[1] === 0)) document.querySelector('.task-detail-subtitle-status').insertAdjacentHTML('afterend', '<div title="' + kBalance[0] + '/' + kBalance[1] + '" class="flags-pink"></div>');

			// првоеряем наличие переработки по модернизации за прошлый месяц
			if(mBalanceP !== undefined && (mBalanceP[0] > mBalanceP[1])) document.querySelector('.task-detail-subtitle-status').insertAdjacentHTML('afterend', '<div title="' + mBalanceP[0] + '/' + mBalanceP[1] + '" class="flags-red-p"></div>');
			// првоеряем наличие переработки по контенту за прошлый месяц
			if(kBalanceP !== undefined && (kBalanceP[0] > kBalanceP[1])) document.querySelector('.task-detail-subtitle-status').insertAdjacentHTML('afterend', '<div title="' + kBalanceP[0] + '/' + kBalanceP[1] + '" class="flags-pink-p"></div>');
		}
	}
}

// получаем из стоки числа
function getNumber(str) {
	str = str.split('/');
	str[0] = Number(str[0].replace(/\D+/g, ''));
	str[1] = Number(str[1].replace(/\D+/g, ''));
	return str;
}

// собираем данные из сервиса, нужно дописать
var dataCollection = function(settings) {
	var arrElem = document.querySelectorAll('[class^="tr"]'),
		objProject = {},
		d = new Date(),
		dat = (d.getDate()) + '.' +  (d.getMonth()+1) + '.' + d.getFullYear(),
		tim = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();

	for(var i = 0; i < arrElem.length-1; i++) {
		if(arrElem[i].querySelector('.left.url a')) {
			var mBalance = getNumber(arrElem[i+1].querySelector('.line-modern .diagramm1Container .diagramm1Value').innerHTML),
					kBalance = getNumber(arrElem[i+1].querySelector('.line-content .diagramm1Container .diagramm1Value').innerHTML),
					mpBalance = getNumber(arrElem[i+1].querySelectorAll('.line-modern .diagramm1Container .diagramm1Value')[1].innerHTML),
					kpBalance = getNumber(arrElem[i+1].querySelectorAll('.line-content .diagramm1Container .diagramm1Value')[1].innerHTML);

			//собираем даныне за текущий переод
			var objId = arrElem[i].querySelector('.left.url a').innerHTML;
			objProject[objId] = {
				current: {},
				past: {}
			};

			if(mBalance[0] >= mBalance[1] || mBalance[1] === 0 || kBalance[0] >= kBalance[1] || kBalance[1] === 0) {
				objProject[objId]['current'] = {
						modernization: mBalance,
						content: kBalance
				};
			}
			// собираем даныне по переработки за предыдущий период
			if(mpBalance[0] > mpBalance[1] || kBalance[0] > kBalance[1]) {
				objProject[objId]['past'] = {
						modernization: mpBalance,
						content: kpBalance
				}
			}
		}
	}
	//сохраняем данные из сервиса в хранилище хрома
	chrome.storage.sync.set({
			service: {
				date: dat,
				time: tim,
				collection: JSON.stringify(objProject)
			}
		}, function() {
			chrome.extension.sendMessage({
				type: "data-collected"
			});
		});
	return;
}