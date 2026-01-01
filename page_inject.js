(function() {
    console.log('🔍 Запуск скрипта для отображения шаблонов раскраски...');
    
    // Флаг чтобы избежать повторной инициализации
    if (window.templateScriptActive) {
        console.log('⚠️ Скрипт уже активен');
        return;
    }
    window.templateScriptActive = true;

    // Создаем стили для отображения
    const style = document.createElement('style');
    style.textContent = `
        .template-overlay-market {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            background: rgba(0, 0, 0, 0.85);
            color: white !important;
            padding: 3px 0;
            font-size: 11px;
            font-weight: bold;
            z-index: 9999 !important;
            text-align: center;
            pointer-events: none;
            border-bottom: 1px solid #333;
            font-family: "Motiva Sans", Arial, sans-serif !important;
        }
        
        .template-overlay-market.normal {
            background: rgba(0, 0, 0, 0.85);
        }
        
        .template-overlay-market.highlight-193 {
            background: rgba(255, 50, 50, 0.95) !important;
            color: white !important;
            border-bottom: 2px solid #ff0000;
            font-weight: 900;
        }

        .template-overlay-market.highlight-target {
            background: rgba(200, 30, 30, 0.95) !important;
            color: white !important;
            border-bottom: 2px solid #ff4444;
            font-weight: 900;
        }
        
        .template-overlay-market span {
            color: #66C0F4 !important;
            font-weight: bold;
        }

        /* Инфо-строка под названием предмета */
        .template-info-line {
            display: flex;
            gap: 8px;
            align-items: center;
            color: #ddd;
            font-size: 12px;
            margin-top: 4px;
            pointer-events: none;
        }

        .template-badge {
            background: rgba(0,0,0,0.6);
            padding: 2px 6px;
            border-radius: 3px;
            color: #fff;
            font-weight: 700;
            font-size: 11px;
        }

        .template-float {
            color: #FFD070;
            font-weight: 700;
            font-size: 11px;
        }
        
        .template-overlay-market.highlight-193 span {
            color: white !important;
            text-shadow: 0 0 3px rgba(255, 255, 255, 0.7);
        }
        
        /* Улучшаем отображение */
        .market_listing_item_img_container {
            position: relative !important;
            overflow: visible !important;
        }
        
        .market_recent_listing_row {
            position: relative !important;
        }
        
        /* Подсветка карточек с шаблоном 193 */
        .item-template-193-market {
            outline: 2px solid red !important;
            outline-offset: 1px;
            border-radius: 2px;
        }

        .item-template-target {
            outline: 3px solid #ff4444 !important;
            outline-offset: 2px;
            border-radius: 3px;
        }
        
        /* Кнопка обновления */
        #template-update-btn {
            transition: all 0.3s ease;
            display: none !important;
        }
        
        #template-update-btn:active {
            transform: scale(0.95);
        }
        
        /* Контейнер для управления (кнопка + ввод шаблона) */
        #template-control-wrap {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 99999;
            display: flex;
            gap: 8px;
            align-items: center;
            pointer-events: auto;
            font-family: Arial, sans-serif;
        }
        
        #template-input {
            width: 72px;
            padding: 6px 8px;
            border-radius: 4px;
            border: 1px solid #333;
            background: #0b1a27;
            color: #fff;
            font-size: 12px;
        }
        
        .template-action-btn {
            padding: 6px 8px;
            border-radius: 4px;
            background: #1b2838;
            color: #fff;
            border: 1px solid #66C0F4;
            cursor: pointer;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);

    // Переменные для управления скриптом
    let isProcessing = false;
    let currentPage = 1;
    // Выбранные пользователем шаблоны для подсветки (массив)
    let targetTemplates = JSON.parse(localStorage.getItem('market_target_templates') || '[]');

    // Функция для получения номера шаблона из asset данных
    function getTemplateNumberFromAsset(assetId) {
        if (!window.g_rgAssets || !window.g_rgAssets['730'] || !window.g_rgAssets['730']['2']) {
            return null;
        }
        
        const asset = window.g_rgAssets['730']['2'][assetId];
        if (!asset || !asset.asset_properties) {
            return null;
        }
        
        // Ищем свойство с propertyid = 1 (это обычно шаблон раскраски)
        const templateProp = asset.asset_properties.find(prop => prop.propertyid === 1);
        return templateProp && templateProp.int_value ? templateProp.int_value.toString() : null;
    }

    // Пытаемся получить float (flot) для лота безопасно из listingInfo или g_rgAssets
    function getFloatForListing(listingInfo, assetId) {
        try {
            // Попробуем найти float в самом listingInfo.asset
            const a = listingInfo?.asset || {};
            let f = null;
            if (a.float_value != null) f = a.float_value;
            else if (a.floatvalue != null) f = a.floatvalue;
            else if (a.floatValue != null) f = a.floatValue;
            else if (a.float != null) f = a.float;

            // Если не нашли в простых полях, попробуем в asset_properties у listingInfo.asset
            if (f == null && a && a.asset_properties && Array.isArray(a.asset_properties)) {
                const p = a.asset_properties.find(prop => prop.propertyid === 2 || prop.propertyid === '2');
                if (p) f = p.float_value ?? p.int_value ?? p.string_value ?? null;
            }

            // Если не нашли, пробуем в window.g_rgAssets
            if (f == null && window.g_rgAssets && window.g_rgAssets['730'] && window.g_rgAssets['730']['2']) {
                const asset = window.g_rgAssets['730']['2'][assetId];
                if (asset) {
                    if (asset.float_value != null) f = asset.float_value;
                    else if (asset.floatvalue != null) f = asset.floatvalue;
                    else if (asset.floatValue != null) f = asset.floatValue;
                    // И проверяем asset_properties в g_rgAssets
                    else if (asset.asset_properties && Array.isArray(asset.asset_properties)) {
                        const p2 = asset.asset_properties.find(prop => prop.propertyid === 2 || prop.propertyid === '2');
                        if (p2) f = p2.float_value ?? p2.int_value ?? p2.string_value ?? null;
                    }
                }
            }

            if (f == null) return null;
            const num = parseFloat(f);
            if (isNaN(num)) return null;
            return num.toFixed(4);
        } catch (e) {
            return null;
        }
    }

    // Получить текстовую метку износа (exterior_wear) из descriptions
    function getExteriorLabel(listingInfo, assetId) {
        try {
            const a = listingInfo?.asset || (window.g_rgAssets && window.g_rgAssets['730'] && window.g_rgAssets['730']['2'] && window.g_rgAssets['730']['2'][assetId]) || null;
            if (!a) return null;
            if (a.descriptions && Array.isArray(a.descriptions)) {
                const d = a.descriptions.find(x => x && x.name && x.name.toString().toLowerCase() === 'exterior_wear');
                if (d && d.value) return d.value.replace(/<[^>]+>/g, '').trim();
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // Функция для обработки одного лота
    function processListing(listingRow) {
        if (listingRow.hasAttribute('data-template-processed')) {
            return null;
        }
        
        const listingId = listingRow.id.replace('listing_', '');
        
        if (window.g_rgListingInfo && window.g_rgListingInfo[listingId]) {
            const listingInfo = window.g_rgListingInfo[listingId];
            const assetId = listingInfo.asset?.id;
            
            if (assetId) {
                const templateNumber = getTemplateNumberFromAsset(assetId);
                
                if (templateNumber) {
                    // Помечаем как обработанный
                    listingRow.setAttribute('data-template-processed', 'true');
                    listingRow.setAttribute('data-template-number', templateNumber);
                    
                    // Добавляем класс для подсветки шаблона 193
                    if (templateNumber === '193') {
                        listingRow.classList.add('item-template-193-market');
                    }
                    // Подсветка для выбранных пользователем шаблонов
                    if (targetTemplates.includes(templateNumber)) {
                        listingRow.classList.add('item-template-target');
                    }
                    
                    // Находим контейнер с изображением и элемент с названием
                    const imgContainer = listingRow.querySelector('.market_listing_item_img_container');
                    const nameEl = listingRow.querySelector('[id*="_name"], .market_listing_item_name, .market_listing_item_name_block');

                    // Получаем float (если доступен)
                    const floatValue = getFloatForListing(listingInfo, assetId);
                    
                    if (imgContainer) {
                        // Удаляем старый оверлей если есть (вдруг остался)
                        const oldOverlay = imgContainer.querySelector('.template-overlay-market');
                        if (oldOverlay) oldOverlay.remove();
                    }

                    // Формируем единый info-line под названием
                    const infoHtmlParts = [];
                    // Шаблон
                    if (templateNumber === '193') {
                        infoHtmlParts.push(`<span class="template-badge" style="background:#b71c1c">ШАБЛОН ${templateNumber} 🔥</span>`);
                    } else if (targetTemplates.includes(templateNumber)) {
                        infoHtmlParts.push(`<span class="template-badge" style="background:#d32f2f">ШАБЛОН ${templateNumber} 🚩</span>`);
                    } else {
                        infoHtmlParts.push(`<span class="template-badge">Pattern ${templateNumber}</span>`);
                    }

                    // float
                    if (floatValue != null) {
                        infoHtmlParts.push(`<span class="template-float">float: ${floatValue}</span>`);
                    }

                    // wear label and inline bar: we'll create elements separately if nameEl exists; else append as overlay to image
                    if (nameEl) {
                        // Remove previous info line if exists
                        const oldInfo = nameEl.parentNode.querySelector('.template-info-line');
                        if (oldInfo) oldInfo.remove();

                        const infoLine = document.createElement('div');
                        infoLine.className = 'template-info-line';
                        infoLine.innerHTML = infoHtmlParts.join(' ');

                        // Если есть float, добавим и мини-бар справа
                        if (floatValue != null) {
                            const fv = parseFloat(floatValue);
                            let wearColor = '#FFD54F';
                            if (!isNaN(fv)) {
                                if (fv < 0.07) { wearColor = '#4CAF50'; }
                                else if (fv < 0.15) { wearColor = '#8BC34A'; }
                                else if (fv < 0.38) { wearColor = '#FFEB3B'; }
                                else if (fv < 0.45) { wearColor = '#FF9800'; }
                                else { wearColor = '#F44336'; }
                            }

                            const bar = document.createElement('span');
                            bar.style.display = 'inline-block';
                            bar.style.width = '80px';
                            bar.style.height = '8px';
                            bar.style.background = '#222';
                            bar.style.borderRadius = '4px';
                            bar.style.overflow = 'hidden';
                            bar.style.marginLeft = '6px';

                            const inner = document.createElement('i');
                            const percent = (!isNaN(fv) ? Math.min(1, fv / 0.6) * 100 : 0);
                            inner.style.display = 'block';
                            inner.style.width = `${percent}%`;
                            inner.style.height = '100%';
                            inner.style.background = wearColor;
                            inner.style.transition = 'width 200ms ease';

                            bar.appendChild(inner);
                            infoLine.appendChild(bar);

                            const wearLabel = getExteriorLabel(listingInfo, assetId);
                            if (wearLabel) {
                                const wl = document.createElement('span');
                                wl.style.marginLeft = '6px';
                                wl.style.fontSize = '11px';
                                wl.style.color = '#ccc';
                                wl.textContent = wearLabel;
                                infoLine.appendChild(wl);
                            }
                        }

                        // Insert after name element
                        try {
                            nameEl.parentNode.insertBefore(infoLine, nameEl.nextSibling);
                        } catch (e) {
                            // fallback: append to image container as before
                            if (imgContainer) {
                                const overlay = document.createElement('div');
                                overlay.className = 'template-overlay-market';
                                overlay.innerHTML = infoHtmlParts.join(' ');
                                imgContainer.style.position = 'relative';
                                imgContainer.appendChild(overlay);
                            }
                        }
                    } else {
                        // Если не нашли nameEl, падаем назад к оверлею над картинкой
                        if (imgContainer) {
                            const oldOverlay = imgContainer.querySelector('.template-overlay-market');
                            if (oldOverlay) oldOverlay.remove();
                            const overlay = document.createElement('div');
                            overlay.className = 'template-overlay-market';
                            overlay.innerHTML = infoHtmlParts.join(' ');

                            if (floatValue != null) {
                                const floatLine = document.createElement('div');
                                floatLine.style.fontSize = '10px';
                                floatLine.style.marginTop = '2px';
                                floatLine.innerHTML = `float: <span style="color:#FFD070;font-weight:bold">${floatValue}</span>`;
                                overlay.appendChild(floatLine);
                            }

                            imgContainer.style.position = 'relative';
                            imgContainer.appendChild(overlay);
                        }
                    }
                    
                    return templateNumber;
                }
            }
        }
        return null;
    }

    // Основная функция для сканирования ТОЛЬКО текущей страницы
    function scanCurrentPage() {
        if (isProcessing) {
            console.log('⏳ Скрипт уже обрабатывает страницу...');
            return;
        }
        
        isProcessing = true;
        console.log('🔍 Сканирую текущую страницу на наличие шаблонов...');
        
        // Ищем все строки с лотами на текущей странице
        const listingRows = document.querySelectorAll('.market_listing_row.market_recent_listing_row');
        const templatesFound = {};
        let processedCount = 0;
        
        listingRows.forEach(row => {
            try {
                const templateNumber = processListing(row);
                if (templateNumber) {
                    templatesFound[templateNumber] = (templatesFound[templateNumber] || 0) + 1;
                    processedCount++;
                }
            } catch (e) {
                // Игнорируем ошибки для отдельных элементов
            }
        });
        
        // Статистика
        showTemplateStats(templatesFound, processedCount);
        
        isProcessing = false;
        return processedCount;
    }

    // Функция для показа статистики
    function showTemplateStats(templatesFound = null, processedCount = 0) {
        // Если не передали данные, собираем их заново
        if (!templatesFound) {
            const items = document.querySelectorAll('[data-template-number]');
            templatesFound = {};
            
            items.forEach(item => {
                const template = item.getAttribute('data-template-number');
                if (template) {
                    templatesFound[template] = (templatesFound[template] || 0) + 1;
                }
            });
            
            processedCount = items.length;
        }
        
        // Сортируем
        const sorted = Object.entries(templatesFound).sort((a, b) => b[1] - a[1]);
        
        console.log('📊 СТАТИСТИКА ШАБЛОНОВ:');
        console.log(`📄 Обработано предметов: ${processedCount}`);
        
        sorted.forEach(([template, count]) => {
            if (template === '193') {
                console.log(`%c🔥 ШАБЛОН ${template}: ${count} шт.`, 'color: red; font-weight: bold; background: rgba(255,0,0,0.1); padding: 2px;');
            } else {
                console.log(`📦 Шаблон ${template}: ${count} шт.`);
            }
        });
        
        // Показываем уведомление если есть 193
        if (templatesFound['193']) {
            console.log(`%c🚨 ВНИМАНИЕ: На странице найдено ${templatesFound['193']} предметов с шаблоном 193!`, 
                       'color: white; background: red; font-size: 14px; padding: 10px; font-weight: bold;');
        }
    }

    // Функция для определения текущей страницы
    function getCurrentPage() {
        const activePage = document.querySelector('.market_paging_pagelink.active');
        if (activePage) {
            const pageText = activePage.textContent.trim();
            return parseInt(pageText) || 1;
        }
        return 1;
    }

    // Функция для принудительного обновления шаблонов
    function forceUpdateTemplates() {
        console.log('🔄 Обновляю шаблоны на текущей странице...');
        
        // Снимаем метки обработанных элементов на ТЕКУЩЕЙ странице
        const currentListings = document.querySelectorAll('.market_listing_row.market_recent_listing_row[data-template-processed]');
        currentListings.forEach(el => {
            el.removeAttribute('data-template-processed');
            el.removeAttribute('data-template-number');
            el.classList.remove('item-template-193-market');
        });
        
        // Удаляем все оверлеи на ТЕКУЩЕЙ странице
        document.querySelectorAll('.market_listing_item_img_container .template-overlay-market').forEach(el => {
            el.remove();
        });
        
        // Запускаем сканирование с небольшой задержкой
        setTimeout(scanCurrentPage, 300);
    }

    // Функция для обработки перехода на новую страницу
    function handlePageChange() {
        const newPage = getCurrentPage();
        
        if (newPage !== currentPage) {
            console.log(`📄 Переход на страницу ${newPage}...`);
            currentPage = newPage;
            
            // Ждем загрузки контента новой страницы
            // Уменьшаем ожидание — запускаем обновление быстрее
            setTimeout(() => {
                console.log('🔄 Загружаю шаблоны для новой страницы...');
                forceUpdateTemplates();
            }, 500); // Даем время Steam загрузить новые данные
        }
    }

    // Наблюдатель за изменениями контента (только для новых страниц)
    function setupPageChangeObserver() {
        // Наблюдаем за контейнером с результатами
        const resultsContainer = document.querySelector('#searchResultsRows');
        if (resultsContainer) {
            const observer = new MutationObserver((mutations) => {
                // Проверяем, сильно ли изменился контент (новая страница)
                for (const mutation of mutations) {
                            if (mutation.type === 'childList' && mutation.addedNodes.length > 5) {
                                // Похоже на загрузку новой страницы
                                // Уменьшаем задержку — быстрее реагируем на загрузку
                                setTimeout(handlePageChange, 200);
                        break;
                    }
                }
            });
            
            observer.observe(resultsContainer, {
                childList: true,
                subtree: false
            });
            
            console.log('👀 Наблюдатель за переключением страниц запущен');
        }
        
        // Также отслеживаем клики по пагинации
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('market_paging_pagelink') || 
                target.classList.contains('pagebtn') ||
                target.closest('.market_paging_pagelink') ||
                target.closest('.pagebtn')) {
                console.log('📄 Обнаружен клик по пагинации...');
                // Даем чуть меньше времени Steam загрузить страницу — ускоряем отклик
                setTimeout(handlePageChange, 300);
            }
        });
    }

    // Инициализация
    function init() {
        console.log('🚀 Инициализация скрипта...');
        
        // Определяем текущую страницу
        currentPage = getCurrentPage();
        console.log(`📄 Текущая страница: ${currentPage}`);
        
        // Запускаем первое сканирование
        setTimeout(() => {
            const processed = scanCurrentPage();
            console.log(`✅ Первоначальное сканирование завершено. Обработано: ${processed} предметов`);
        }, 1000);
        
        // Настраиваем наблюдение за переключением страниц
        // Уменьшаем задержку инициализации наблюдателя, чтобы быстрее реагировать
        setTimeout(setupPageChangeObserver, 800);
        
        // Добавляем кнопку для ручного обновления
        addUpdateButton();
        
        console.log('%c✅ Скрипт успешно инициализирован!', 'color: green; font-weight: bold;');
        console.log('📌 Скрипт будет обновлять шаблоны только при переключении страниц');
    }

    // Функция добавления кнопки обновления
    function addUpdateButton() {
        // Проверяем, не добавлена ли уже кнопка
        if (document.getElementById('template-update-btn')) {
            return;
        }
        // Создаем контейнер управления (кнопка + ввод шаблона)
        const wrap = document.createElement('div');
        wrap.id = 'template-control-wrap';

        // (Extension icon removed — icon belongs to extension UI, not injected page UI)

        const updateButton = document.createElement('button');
        updateButton.id = 'template-update-btn';
        updateButton.className = 'template-action-btn';
        updateButton.textContent = '🔄 Обновить';
        updateButton.title = 'Обновить шаблоны на текущей странице';
        updateButton.onclick = forceUpdateTemplates;

        const input = document.createElement('input');
        input.id = 'template-input';
        input.placeholder = 'Шаблон';
        input.type = 'number';

        const addBtn = document.createElement('button');
        addBtn.className = 'template-action-btn';
        addBtn.textContent = 'Добавить';
        addBtn.title = 'Добавить шаблон для подсветки';
        addBtn.onclick = () => {
            const v = input.value?.toString().trim();
            if (v) {
                if (!targetTemplates.includes(v)) {
                    targetTemplates.push(v);
                    localStorage.setItem('market_target_templates', JSON.stringify(targetTemplates));
                    console.log(`✅ Добавлен шаблон для подсветки: ${v}`);
                    input.value = '';
                    updateTemplatesList();
                    forceUpdateTemplates();
                } else {
                    console.log(`⚠️ Шаблон ${v} уже в списке`);
                }
            }
        };

        const templatesListDiv = document.createElement('div');
        templatesListDiv.id = 'template-list-display';
        templatesListDiv.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            font-size: 11px;
            color: #ddd;
            max-width: 150px;
            background: rgba(0, 0, 0, 0.5);
            padding: 4px;
            border-radius: 4px;
        `;

        const updateTemplatesList = () => {
            templatesListDiv.innerHTML = '';
            if (targetTemplates.length === 0) {
                templatesListDiv.textContent = 'Нет выбранных';
                templatesListDiv.style.color = '#999';
                return;
            }
            targetTemplates.forEach(template => {
                const tag = document.createElement('span');
                tag.style.cssText = `
                    background: #d32f2f;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    cursor: pointer;
                    user-select: none;
                    font-weight: bold;
                    transition: background 0.2s;
                `;
                tag.textContent = `${template} ✕`;
                tag.title = 'Нажмите чтобы удалить';
                tag.onmouseover = () => tag.style.background = '#b71c1c';
                tag.onmouseout = () => tag.style.background = '#d32f2f';
                tag.onclick = () => {
                    targetTemplates = targetTemplates.filter(t => t !== template);
                    localStorage.setItem('market_target_templates', JSON.stringify(targetTemplates));
                    console.log(`❌ Шаблон ${template} удален из подсветки`);
                    updateTemplatesList();
                    forceUpdateTemplates();
                };
                templatesListDiv.appendChild(tag);
            });
        };

        wrap.appendChild(updateButton);
        wrap.appendChild(input);
        wrap.appendChild(addBtn);
        wrap.appendChild(templatesListDiv);

        document.body.appendChild(wrap);
        updateTemplatesList();
        console.log('🔼 Контролы шаблонов добавлены');
    }

    // Запускаем инициализацию
    setTimeout(init, 500);

    // Добавляем функции в глобальную область видимости
    window.updateTemplates = forceUpdateTemplates;
    window.showTemplateStats = showTemplateStats;
    window.scanCurrentPage = scanCurrentPage;

})();
