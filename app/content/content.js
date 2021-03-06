console.log('%c - Plugin «Functioning»‎ script loaded ', 'background: #bada55; color: #222');
var settings = {},
		changeCounter = 0; // общ колличество итераций

	//console.log((d.getDate()+1) + '.' +  (d.getMonth()+1) + '.' + d.getFullYear() + ' 19:00:00')

// отслеживаем входящие сообщения
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
	switch(message.type) {
		case "sort":
			// выполняем сортировку
			// changeCounter должен идти от обратного
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
			// вывод содержимого для страницы задачи
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


	// обновляем доп. элементы на странице если это не первая итерация
	if(changData < countObj.itaretia) displayContentsMain(settings);

	//проверяем наличие доп. элементов на страниче, если элементов нет выводим сообщение
	if(document.querySelectorAll('.in-terms-of').length === 0) {
		chrome.extension.sendMessage({
			type: "element-check"
		});
		return;
	}

	/*
		идем с конца списка исключаю планируемые задачи
		проверяем на выходные дни
		проверяем на исключения из настроек
	*/
	//countObj.plan // колличество задач в плане
	//countObj.task // общее кол. задач - планируемые
	//countObj.itaretia
	if(changData !== 1) {
		// bias - смещение, arrTask - массив строк
		// умножаем среднее значение задач на день на итерацию
		var bias = (countObj.plan + countObj.task) - (countObj.itaretia - changData) * settings.options.mean;
		var dateTask = highlightTasks(bias, changData);

		if(dateTask) {
			// устанавлеваем параметры для перноса задач
			document.querySelector('.main-dropdown.main-grid-panel-control').click();
			debugger;
			document.querySelectorAll('.menu-popup-item.main-dropdown-item-not-selected')[2].click();
			debugger;
			document.querySelector('[name="ACTION_SET_DEADLINE_from"]').value = dateTask;
			debugger;
			document.querySelector('.main-grid-buttons.apply').click();
			debugger;
			document.querySelector('.popup-window-button.popup-window-button-accept').click();
		}
	}
}

// выделение задач по определенному смещению
function highlightTasks(bias, iter) {
	var obPlan = JSON.parse(getCookie('plannedTasks')),
			arrTask = document.querySelectorAll('.main-grid-row.main-grid-row-body'),
			exclusion = settings.options.ban, // массив исключений
			k = settings.options.mean,
			d = new Date(), // значения текущей даты
			dIteration = new Date(); // дата для итерации (текущая дата + кол. итераций iter)
			dIteration.setDate(dIteration.getDate() + iter),
			exceptions = true;

	for(var i = bias; i <= arrTask.length; i--) {
		var elem = arrTask[i-1]; // задача на странице

		if(k === 0 || i === 0) break;

		var checkTack = elem.querySelector('.column-plan input').checked,
				nameTask = elem.querySelector('.task-title').innerHTML, // название задачи
				dateTask =elem.querySelectorAll('.task-deadline-datetime span')[0].getAttribute('onclick').split('\'')[1].split(' ')[0].split('.'); // дата установленная у задачи
		dateTask =  new Date(dateTask[2], dateTask[1]-1, dateTask[0]);

		// проверяем есть ли эта задача в плане на завтрашний день
		if(checkTack) {
			if(iter !== 1) continue;
			// выделяем задачу из плана, если еще не выделена
			if(!elem.querySelector('td input').checked) elem.querySelector('td').click();
		} else {
			// проверяем есть ли эта задача в исключениях
			for(var j = 0; j < exclusion.length; j++) {
				if(nameTask.indexOf(exclusion[j]) !== -1) {
					// подсветить задачу из исключений
					elem.classList.add('prohibited');
					if(exceptions) exceptions = confirm("Вы не запланировали задачу из исключений, остановиться?");
					if(exceptions) {
						return false;
					}
					continue;
				}
			}
			// если дата, установленная у задачи, меньше планируемой выделяем её
			if(dateTask < dIteration) {
				k--;
				elem.querySelector('td').click();
			}
		}
	}
	// проверить на выходные
	return (String(dIteration.getDate()).length === 1 ? '0' + String(dIteration.getDate()) : dIteration.getDate()) + '.' + (String(dIteration.getMonth()+1).length === 1 ? '0' + String(dIteration.getMonth()+1) : dIteration.getMonth()+1) + '.' + dIteration.getFullYear() + ' 19:00:00';
}

/*
	получаем:
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

// копируем список выделенных задач в буфер обмена
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
			typeTask = document.querySelector('.special-selector-body[tabindex="' + key + '"]').getAttribute('title');
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
	var date = new Date();
	date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 00, 00, 00);
	options = {
		path: '/',
		expires: date.toUTCString()
	};

	let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

	for (let optionKey in options) {
	updatedCookie += "; " + optionKey;
		let optionValue = options[optionKey];
		if (optionValue !== true) {
			updatedCookie += "=" + optionValue;
		}
	}
	//console.log(updatedCookie);
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
				// если объекта нет, добавляем
				jsonTasks[idTask] = {
					id: idTask,
					checkbox: valType,
					select: document.querySelector('.special-selector-body[tabindex="' + idTask + '"] .special-selector-elem').getAttribute('value')
				};
				jsonTasks = JSON.stringify(jsonTasks);
				setCookie('plannedTasks', jsonTasks);
			}
		} else {
			var objTask = {};
			objTask[idTask] = {
				id: idTask,
				checkbox: valType,
				select: document.querySelector('.special-selector-body[tabindex="' + idTask + '"] .special-selector-elem').getAttribute('value')
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
				var div = document.createElement('div'),
						elemOption = '',
						elemSelected = '',
						elemValue = '';

				div.className = "special-selector-body";
				div.setAttribute('tabindex', elemId);

				for(var j = 0; j < settings.options.types.length; j++) {
					if(saveTasks[elemId] !== undefined && Number(saveTasks[elemId]['select']) === j) {
						elemSelected = settings.options.types[j];
						elemValue = j;
					} else if(Number(settings.options.main) === j) {
						elemSelected = settings.options.types[j];
						elemValue = j;
					}
					elemOption += '<span value="' + j + '">' + settings.options.types[j] + '</span>';
				}
				var titleSelect = (elemSelected.indexOf('|') !== -1 ? elemSelected.split('|')[1] : elemSelected);
				div.setAttribute('title', titleSelect);

				div.innerHTML = '<div class="special-selector-elem" value="' + elemValue + '">' + titleSelect + '</div><div class="special-selector-list">' + elemOption + '</div>';

				if(saveTasks[elemId] !== undefined && saveTasks[elemId]['checkbox']) attrChecked = 'checked="true"';
				// добавитм новый чекбокс
				arrRowTask[i].querySelector('.main-grid-cell-checkbox').insertAdjacentHTML('afterend', '<td class="column-plan"><label for="elem-plan-' + elemId +'" class="column-plan-label"><input type="checkbox" id="elem-plan-' + elemId + '" value="' + elemId + '" class="in-terms-of" title="Добавить в план на следующий день" ' + attrChecked + '><span></span></label></td><td class="task-type-selector"></td>');

				arrRowTask[i].querySelector('.task-type-selector').append(div);

				var customSelect = arrRowTask[i].querySelector('.special-selector-body');

				customSelect.querySelector('.special-selector-elem').addEventListener('click', function(e) {
					if(this.parentNode.classList.value.indexOf('special-selector-body') !== -1) {
						// изменяем расположение выпадающего списка
							var thisSelectId = this.parentNode.getAttribute('tabindex'), // идентификатор задачи
									lastSelectId = arrRowTask[arrRowTask.length-1].querySelector('.special-selector-body').getAttribute('tabindex'), // идентификатор последней задачи
									lineHeight = arrRowTask[arrRowTask.length-1].offsetHeight; // высота строки последней задачи

									this.parentNode.querySelector('.special-selector-list').style.display = 'block';

									var listРeight = this.parentNode.querySelector('.special-selector-list').offsetHeight; // высота списка перечная типов
									
									this.parentNode.querySelector('.special-selector-list').style.display = '';

							if(thisSelectId === lastSelectId) {
								this.parentNode.querySelector('.special-selector-list').style.top = '-' + listРeight + 'px';
							} else {
								for(var k = arrRowTask.length-1; k !== ((arrRowTask.length-1) - Math.ceil(listРeight/lineHeight)); k--) {
									var taskExceptions = arrRowTask[k].querySelector('.special-selector-body').getAttribute('tabindex')
									if(thisSelectId == taskExceptions) {
										this.parentNode.querySelector('.special-selector-list').style.top = '-' + listРeight + 'px';
										break;
									}
								}
							}

							this.parentNode.classList.toggle('active');
					}
				});

				customSelect.addEventListener('blur', function() {
					if(this.classList.value.indexOf('special-selector-body') !== -1) this.classList.remove('active');
				});

				customSelect.querySelector('.special-selector-list').addEventListener('click', function(e) {
					if(e.target.tagName.indexOf("SPAN") !== -1) {
						if(this.parentNode.classList.value.indexOf('special-selector-body') !== -1) {
							this.parentNode.querySelector('.special-selector-elem').setAttribute('value', e.target.getAttribute('value'));
							var titleSelect = (e.target.innerHTML.indexOf('|') !== -1 ? e.target.innerHTML.split('|')[1] : e.target.innerHTML);
							this.parentNode.setAttribute('title', titleSelect);
							this.parentNode.querySelector('.special-selector-elem').innerHTML = titleSelect;
							this.parentNode.classList.remove('active');
							this.parentNode.blur();

							saveTask('select', this.parentNode.getAttribute('tabindex'), e.target.getAttribute('value'));
						}
					}
				});

				// добавляем кривой обработчик для chekboxa и select
				arrRowTask[i].addEventListener('change', function(e) {
					if(e.target.className.indexOf('in-terms-of') !== -1) saveTask('checkbox', e.target.value, e.target.checked);
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
			saveTasks = getCookie('plannedTasks')!== undefined ? JSON.parse(getCookie('plannedTasks')) : '',
			attrChecked = '',
			attrSelect = '',
			checkFlag = document.querySelector('.field_crm_entity a'),
			collection = settings.observice !== undefined ? JSON.parse(settings.observice.collection) : false;

		// проверяем отображать только флаги или нет
		if(!settings.toggle.flags) {
				var div = document.createElement('div'),
						elemOption = '',
						elemSelected = '',
						elemValue = '';

				div.className = "special-selector-body";
				div.setAttribute('tabindex', elemId);

				for(var j = 0; j < settings.options.types.length; j++) {
					if(saveTasks[elemId] !== undefined && Number(saveTasks[elemId]['select']) === j) {
						elemSelected = settings.options.types[j];
						elemValue = j;
					} else if(Number(settings.options.main) === j) {
						elemSelected = settings.options.types[j];
						elemValue = j;
					}
					elemOption += '<span value="' + j + '">' + settings.options.types[j] + '</span>';
				}

				var titleSelect = (elemSelected.indexOf('|') !== -1 ? elemSelected.split('|')[1] : elemSelected);
				div.setAttribute('title', titleSelect);

				div.innerHTML = '<div class="special-selector-elem" value="' + elemValue + '">' + titleSelect + '</div><div class="special-selector-list">' + elemOption + '</div>';

			if(saveTasks[elemId] !== undefined && collection && saveTasks[elemId]['checkbox']) attrChecked = 'checked="true"';
			addTextTask.insertAdjacentHTML('afterend', '<div class="selection-line"><label><b>Добавить в план на следующий день</b> <input type="checkbox" value="' + elemId + '" class="in-terms-of" title="Добавить в план на следующий день" ' + attrChecked + '></label> / <label><b>Тип задачи</b></label></div>');

				document.querySelectorAll('.selection-line b')[1].after(div);

				var customSelect = document.querySelector('.special-selector-body');

				customSelect.querySelector('.special-selector-elem').addEventListener('click', function(e) {
					if(this.parentNode.classList.value.indexOf('special-selector-body') !== -1) this.parentNode.classList.toggle('active');
				});

				customSelect.addEventListener('blur', function() {
					if(this.classList.value.indexOf('special-selector-body') !== -1) this.classList.remove('active');
				});

				customSelect.querySelector('.special-selector-list').addEventListener('click', function(e) {
					if(e.target.tagName.indexOf("SPAN") !== -1) {
						if(this.parentNode.classList.value.indexOf('special-selector-body') !== -1) {
							this.parentNode.querySelector('.special-selector-elem').setAttribute('value', e.target.getAttribute('value'));
							var titleSelect = (e.target.innerHTML.indexOf('|') !== -1 ? e.target.innerHTML.split('|')[1] : e.target.innerHTML);
							this.parentNode.setAttribute('title', titleSelect);
							this.parentNode.querySelector('.special-selector-elem').innerHTML = titleSelect;
							this.parentNode.classList.remove('active');
							this.parentNode.blur();

							saveTask('select', this.parentNode.getAttribute('tabindex'), e.target.getAttribute('value'));
						}
					}
				});

			// добавляем обработчик для chekboxa
			document.querySelector('.task-detail-header').addEventListener('change', function(e) {
				if(e.target.className.indexOf('in-terms-of') !== -1) saveTask('checkbox', e.target.value, e.target.checked);
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
	//сохраняем данные из сервиса в хранилище хрома если значение получено
	if(JSON.stringify(objProject).length > 0) {
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
	}
	return;
}