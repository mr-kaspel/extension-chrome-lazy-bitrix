// стандартные настроки расширения
var mainPage = '/company/personal/user/41/tasks/',
	taskPageS = '/company/personal/user/41/tasks/task/view/',
	ratingFormula = '',
	projectService = 'http://192.168.0.49/_v3/',
	typesOfTasks = ['<img src="https://img.icons8.com/dotty/80/000000/window-search.png"/>|Оптимизация', '<img src="https://img.icons8.com/wired/64/000000/uninstalling-updates.png"/>|Контент+Доп.', '<img src="https://img.icons8.com/ios/50/000000/code.png"/>|Модернизация', '<img src="https://img.icons8.com/ios/50/000000/web.png"/>|Доп. оплата (Конт)', '<img src="https://img.icons8.com/ios/50/000000/travis-ci.png"/>|Доп. оплата (Модерн)', '<img src="https://img.icons8.com/ios/50/000000/paid-search.png"/>|Кон. реклама', '<img src="https://img.icons8.com/ios/50/000000/google-code.png"/>|Разработка сайта', '<img src="https://img.icons8.com/dotty/80/000000/window-other.png"/>|Другое', '<img src="https://img.icons8.com/ios/50/000000/channel-mosaic.png"/>|Адаптивная верстка', '<img src="https://img.icons8.com/ios/50/000000/sales-channels.png"/>|Многоканальность'],
	notTolerate = ['доп.оплата', 'Выполнить до', 'срочно'],
	sorting = ['общие', 'срочно', 'доп.оплата'],
	hotkeys = 'Ctrl + Shift',
	mainTypeOfTasks = 3,
	mean = 10,
	exceptions = true,
	settings = {},
	changeCounter = 0, // колличество итераций по убыванию
	countAJAX = 0; // счетчик для корректного отлова события переноса задач

// проверяем сохранены настройки или нет
chrome.storage.sync.get(['key'], function(result) {
	if(result.key == undefined) {
		// сохраняем настройки
		chrome.storage.sync.set({
			key: {
				page: mainPage,
				task: taskPageS,
				formula: ratingFormula,
				service: projectService,
				types: typesOfTasks,
				ban: notTolerate,
				sorting: sorting,
				hotkeys: hotkeys,
				main: mainTypeOfTasks,
				mean: mean,
				exceptions: exceptions
			}
		}, function() {
			console.log('Страндартные настройки 1 сохранены!');
		});
	} else {
		settings.options = result.key;
	}
});

// обновляем объект с данныеми из сервиса учета времени проектов
chrome.storage.sync.get(['service'], function(result) {
	if(result.service !== undefined) {
		settings.observice = result.service;
	}
});

// получаем значения чекбоксов из popup
chrome.storage.sync.get(['toggle'], function(result) {
	if(result.toggle !== undefined) {
		settings.toggle = result.toggle;
	}
});

// отслеживаем завершенные ajax запросы
chrome.webRequest.onCompleted.addListener(function(details) {
		// выбираем только xmlhttp запросы
		if(details.type.indexOf('xmlhttprequest') !== -1) {
			console.log(details);
			console.log(details.type);
			// отслеживаем первый завершенные перенос задач
			if(changeCounter > 0) {
					// первое обязательное событие
					if(details.url.indexOf('F_CANCEL=Y') !== -1 && details.url.indexOf('clear_filter=Y') !== -1 && details.url.indexOf('IFRAME=N') !== -1 && details.url.indexOf('IFRAME=N') !== -1 && details.url.indexOf('current_fieldset=SOCSERV') !== -1 && details.url.indexOf('internal=true') !== -1 && details.url.indexOf('grid_action=showpage') !== -1 && details.url.indexOf('grid_action=showpage') !== -1) {
					countAJAX = 1;
				}
				// второе обязательное событие + проверка счетчика
				if(countAJAX == 1 && details.url.indexOf('tasks.interface.toolbar/ajax.php' !== -1)) {
					countAJAX = 0;
					console.log(true);
					taskTransfer();
				}
			}
			// обновить данные на странице задачи
		}
	},
	{urls: ["<all_urls>"]}
);

// отслеживаем изменения в хранилище и обновляем переменную
chrome.storage.onChanged.addListener(function(changes, namespace) {
	// если были изменены данные настроект обновляем значение в переменной
	for (var key in changes) {
		var storageChange = changes[key];
		if(key.indexOf('key') !== -1 && settings.options !== undefined) {
			settings.options = storageChange.newValue;
		}
		// если были изменены данные из сервиса сбора работ обновляем значение в переменной
		if(key.indexOf('service') !== -1) {
			settings.observice = storageChange.newValue;
		}
		if(key.indexOf('toggle') !== -1) {
			settings.toggle = storageChange.newValue;
		}
	}
});

// отслеживаем событие переключение между вкладками
chrome.tabs.onActivated.addListener(function(tabInfo) {
	chrome.tabs.get(tabInfo.tabId, function (tab) {
		if (tab.url) {
			var host = tab.url.split('?')[0];
			if(host.indexOf(settings.options.page) !== -1) {
				chrome.browserAction.setIcon({
					path: {
						"19": "icons/19x19.png",
						"38": "icons/38x38.png"
					}
				});
			} else {
				chrome.browserAction.setIcon({
					path: {
						"19": "icons/19x19_h.png",
						"38": "icons/38x38_h.png"
					}
				});
			}
		}
	});
});

/* отлавливаем сообщение из popup.js и из content.js */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	switch(request.type) {
		case "itaretia":
			changeCounter = request.count;
			break;
		case "task-transfer":
			// перенос задач на следующий день
			changeCounter = 1; // используется для входного значения, последующий подсчет происходит в контексте страницы, файл content.js
			taskTransfer();
			break;
			case "generated-report":
			generatedReport();
			break;
		case "content":
			var d = new Date(),
				checkDate = false;

			//проверяем данные на актуальность
			if(settings.observice !== undefined && Number(settings.observice.date.split('.')[2]) == Number(d.getFullYear())) {
				if(Number(settings.observice.date.split('.')[1]) == Number(d.getMonth()+1)) {
					if(Number(settings.observice.date.split('.')[0]) !== Number(d.getDate())) {
						checkDate = true;
					}
				} else {
					checkDate = true;
				}
			} else {
				checkDate = true;
			}
			if(checkDate) {
				chrome.browserAction.setIcon({
					path: {
						"19": "icons/19x19_r.png",
						"38": "icons/38x38_r.png"
					}
				});
			} else {
				chrome.browserAction.setIcon({
					path: {
						"19": "icons/19x19.png",
						"38": "icons/38x38.png"
					}
				});
			}
			// проверяем какая страница открыта главная, задача или сервис
			var pathname = request.data.pathname.split('?')[0], // удаляем из строки get параметры
					options = {
				type: 'basic',
				title: 'Так так так',
				message: 'Для корректной работы необходимо обновить данные. Для этого перейди на страницу сервиса "Учет работ по продвижению проектов (версия 3.0)"',
				iconUrl: '/icons/128x128_r.png'
			};

			if(settings.options.page == pathname) {
				contentsMain(settings);
				// проверяем на актуальность данные и выводим сообщение
				if(checkDate) {
					chrome.notifications.create(options);
				}
			}
			if(pathname.indexOf(settings.options.task) !== -1) {
				taskPage(settings);
				// проверяем на актуальность данные и выводим сообщение
				if(checkDate) {
					chrome.notifications.create(options);
				}
			}
			if(request.data.href.indexOf(settings.options.service) !== -1) {
				servicePage(settings);
			}
			break;
		case "count":
			// колличество задач добавленных в план на следующий день
			chrome.browserAction.setBadgeText({text: (request.data === 0) ? '' : String(request.data)});
			chrome.browserAction.setBadgeBackgroundColor({color: '#4688F1'});
			break;
		case "data-collected":
			// выводить сообщение о удачном сохранении данных из сервиса
			var options = {
				type: 'basic',
				title: 'Оу, всё получилось!',
				message: 'Данные по каждому из клиентов с сервиса учета работ по продвижения собраны. Всё сохранено в хранилище. Собранные данные можно посмотреть в настройках расширения. Теперь всё должно работать!',
				iconUrl: 'https://img.icons8.com/offices/160/000000/brutus.png'
			};
			chrome.notifications.create(options);
			// перезагружаем расширения для обновления данных
			/*setTimeout(function() {
				chrome.runtime.reload();
			}, 750);*/
			break;
		case "buffered":
			var options = {
				type: 'basic',
				title: 'Скопировано',
				message: 'Сформированный список задач перенесен в буфер обмена, осталось только вставить данные в файл отчета.',
				iconUrl: '/icons/128x128.png'
			};
			chrome.notifications.create(options);
			break;
		case "buffered-error":
			var options = {
				type: 'basic',
				title: 'Не удалось!',
				message: 'Сформировать и скопировать данные в буфер обмена не получилось, произошла ошибка.',
				iconUrl: '/icons/128x128_r.png'
			};
			chrome.notifications.create(options);
			break;
	}
});

/* Функции */
// перенос задач на следующий день
var taskTransfer = function() {
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {
			type: "sort",
			settings: settings
		});
	});
}

// копировать сформированный отчет в буфер обмена
var generatedReport = function() {
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {
			type: "generated-report",
			settings: settings
		});

		// передаем значение в значек расширения
		//chrome.browserAction.setBadgeText({text: "red!"});
	});
}

// определили, что это главная страница, передаем настроки и отправляем значения в content
var contentsMain = function(settings) {
	chrome.tabs.query({
		currentWindow: true,
		active: true
	},function (tabArray) {
			chrome.tabs.sendMessage(tabArray[0].id, {
				type: "contentsMain",
				settings: settings
			});
		}
	);
}

// определили, что это страница задачи, передаем настроки и отправляем значения в content
var taskPage = function(settings) {
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {
			type: "contentsTask",
			settings: settings
		});
	});
}

// определили, что это страница сервиса, передаем настроки и отправляем значения в content
var servicePage = function(settings) {
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {
			type: "contentsService",
			settings: settings
		});
	});
}