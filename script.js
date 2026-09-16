document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = {
        storageKey: 'points_history',
        canvas: {
            scale: 130,
            pointRadius: 4.5,
            shapeFillColor: '#3399ff',
            hitColor: '#16a34a',
            missColor: '#dc2626'
        },
        rangeY: { min: -3, max: 5 }
    };

    const elements = {
        canvas: document.getElementById('graph-canvas'),
        form: document.getElementById('check-form'),
        xSelect: document.getElementById('x-select'),
        yInput: document.getElementById('y-input'),
        rCheckboxes: document.querySelectorAll('input[name="r-check"]'),
        resultsBody: document.getElementById('results-body'),
        clearBtn: document.getElementById('clear-btn'),
        errors: {
            x: document.getElementById('x-error'),
            y: document.getElementById('y-error'),
            r: document.getElementById('r-error')
        }
    };

    const ctx = elements.canvas.getContext('2d');

    const checkQuadrant1 = (x, y, r) => (x >= 0 && y >= 0) && (x * x + y * y <= (r / 2) ** 2);

    const checkQuadrant3 = (x, y, r) => (x <= 0 && y <= 0) && (x >= -r && y >= -r);

    const checkQuadrant4 = (x, y, r) => (x >= 0 && y <= 0) && (y >= x - r);

    function checkAreaHit(x, y, r) {
        return checkQuadrant1(x, y, r) || checkQuadrant3(x, y, r) || checkQuadrant4(x, y, r);
    }

    function validateX(xValue) {
        return xValue !== '' && !isNaN(parseFloat(xValue));
    }

    function parseAndValidateY(yRawValue) {
        const cleaned = yRawValue.trim().replace(',', '.');
        //const num = parseFloat(cleaned);

        const parts = cleaned.split('.');
        let normalizedStr = cleaned;
        if (parts.length === 2 && parts[1].length > 15) {
            normalizedStr = `${parts[0]}.${parts[1].substring(0, 12)}`;
        }

        const num = parseFloat(normalizedStr);
        
        const isValid = cleaned !== '' &&
                        !isNaN(num) &&
                        isFinite(cleaned) &&
                        num > CONFIG.rangeY.min &&
                        num < CONFIG.rangeY.max;

        return { isValid, value: num };
    }

    function getSelectedR() {
        const checked = Array.from(elements.rCheckboxes).filter(cb => cb.checked);
        return checked.length === 1 ? parseFloat(checked[0].value) : null;
    }

    function setErrorMessage(errorElement, isVisible) {
        errorElement.style.display = isVisible ? 'block' : 'none';
    }

    function validateFormInputs() {
        const isXValid = validateX(elements.xSelect.value);
        const { isValid: isYValid, value: yValue } = parseAndValidateY(elements.yInput.value);
        const rValue = getSelectedR();
        const isRValid = rValue !== null;

        setErrorMessage(elements.errors.x, !isXValid);
        setErrorMessage(elements.errors.y, !isYValid);
        setErrorMessage(elements.errors.r, !isRValid);

        if (!isXValid || !isYValid || !isRValid) {
            return null;
        }

        return {
            x: parseFloat(elements.xSelect.value),
            y: yValue,
            r: rValue
        };
    }

    function loadHistory() {
        try {
            const raw = localStorage.getItem(CONFIG.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveRecord(record) {
        const history = loadHistory();
        history.unshift(record);
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(history));
    }

    function clearHistory() {
        localStorage.removeItem(CONFIG.storageKey);
    }

    function formatClientDateTime(timestamp) {
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        }).format(new Date(timestamp));
    }

    function drawSector(centerX, centerY, scale) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, scale / 2, 1.5 * Math.PI, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fill();
    }

    function drawRectangle(centerX, centerY, scale) {
        ctx.fillRect(centerX - scale, centerY, scale, scale);
    }

    function drawTriangle(centerX, centerY, scale) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + scale, centerY);
        ctx.lineTo(centerX, centerY + scale);
        ctx.closePath();
        ctx.fill();
    }

    function drawShapes(centerX, centerY, scale) {
        ctx.fillStyle = CONFIG.canvas.shapeFillColor;
        drawSector(centerX, centerY, scale);
        drawRectangle(centerX, centerY, scale);
        drawTriangle(centerX, centerY, scale);
    }

    function drawArrow(toX, toY, isVertical = false) {
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        if (isVertical) {
            ctx.lineTo(toX - 4, toY + 8);
            ctx.lineTo(toX + 4, toY + 8);
        } else {
            ctx.lineTo(toX - 8, toY - 4);
            ctx.lineTo(toX - 8, toY + 4);
        }
        ctx.closePath();
        ctx.fill();
    }

    function drawAxes(width, height, centerX, centerY) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#000000';
        ctx.font = '12px sans-serif';

        ctx.beginPath();
        ctx.moveTo(10, centerY);
        ctx.lineTo(width - 10, centerY);
        ctx.stroke();
        drawArrow(width - 10, centerY, false);
        ctx.fillText('x', width - 15, centerY - 8);

        ctx.beginPath();
        ctx.moveTo(centerX, height - 10);
        ctx.lineTo(centerX, 10);
        ctx.stroke();
        drawArrow(centerX, 10, true);
        ctx.fillText('y', centerX + 8, 15);
    }

    function drawTicks(centerX, centerY, scale) {
        const ticks = [
            { x: centerX - scale, y: centerY, label: '-R', isX: true },
            { x: centerX - scale / 2, y: centerY, label: '-R/2', isX: true },
            { x: centerX + scale / 2, y: centerY, label: 'R/2', isX: true },
            { x: centerX + scale, y: centerY, label: 'R', isX: true },
            { x: centerX, y: centerY - scale, label: 'R', isX: false },
            { x: centerX, y: centerY - scale / 2, label: 'R/2', isX: false },
            { x: centerX, y: centerY + scale / 2, label: '-R/2', isX: false },
            { x: centerX, y: centerY + scale, label: '-R', isX: false },
        ];

        ticks.forEach(t => {
            ctx.beginPath();
            if (t.isX) {
                ctx.moveTo(t.x, centerY - 3);
                ctx.lineTo(t.x, centerY + 3);
                ctx.fillText(t.label, t.x - 10, centerY + 18);
            } else {
                ctx.moveTo(centerX - 3, t.y);
                ctx.lineTo(centerX + 3, t.y);
                ctx.fillText(t.label, centerX + 8, t.y + 4);
            }
            ctx.stroke();
        });
    }

    function drawSinglePoint(pt, centerX, centerY, scale, currentR) {
        const px = centerX + (pt.x / currentR) * scale;
        const py = centerY - (pt.y / currentR) * scale;

        const isHit = checkAreaHit(pt.x, pt.y, currentR);

        ctx.beginPath();
        ctx.arc(px, py, CONFIG.canvas.pointRadius, 0, 2 * Math.PI);
        ctx.fillStyle = isHit ? CONFIG.canvas.hitColor : CONFIG.canvas.missColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawPointsLayer(centerX, centerY, scale, currentR) {
        if (!currentR) return;
        const history = loadHistory();
        history.forEach(pt => drawSinglePoint(pt, centerX, centerY, scale, currentR));
    }

    function redrawCanvas() {
        const { width, height } = elements.canvas;
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = CONFIG.canvas.scale;
        const currentR = getSelectedR() || 2;

        ctx.clearRect(0, 0, width, height);

        drawShapes(centerX, centerY, scale);
        drawAxes(width, height, centerX, centerY);
        drawTicks(centerX, centerY, scale);
        drawPointsLayer(centerX, centerY, scale, currentR);
    }

    function createTableRow(record) {
        const tr = document.createElement('tr');
        const hitStatus = record.hit
            ? `<span class="status-hit">Попадание</span>`
            : `<span class="status-miss">Промах</span>`;

        tr.innerHTML = `
            <td>${record.x}</td>
            <td>${record.y}</td>
            <td>${record.r}</td>
            <td>${hitStatus}</td>
            <td>${formatClientDateTime(record.timestamp)}</td>
        `;
        return tr;
    }

    function createEmptyRow() {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="color: #94a3b8; padding: 15px;">Нет результатов</td>`;
        return tr;
    }

    function renderResultsTable() {
        const history = loadHistory();
        elements.resultsBody.innerHTML = '';

        if (history.length === 0) {
            elements.resultsBody.appendChild(createEmptyRow());
            return;
        }

        const fragment = document.createDocumentFragment();
        history.forEach(item => fragment.appendChild(createTableRow(item)));
        elements.resultsBody.appendChild(fragment);
    }

    function setupExclusiveCheckboxes() {
        elements.rCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    elements.rCheckboxes.forEach(cb => {
                        if (cb !== this) cb.checked = false;
                    });
                }
                redrawCanvas();
            });
        });
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const validData = validateFormInputs();
        if (!validData) return;

        const isHit = checkAreaHit(validData.x, validData.y, validData.r);

        const newRecord = {
            ...validData,
            hit: isHit,
            timestamp: Date.now()
        };

        saveRecord(newRecord);
        renderResultsTable();
        redrawCanvas();
    }

    function handleClearHistory() {
        clearHistory();
        renderResultsTable();
        redrawCanvas();
    }

    function init() {
        setupExclusiveCheckboxes();
        elements.form.addEventListener('submit', handleFormSubmit);
        elements.clearBtn.addEventListener('click', handleClearHistory);

        renderResultsTable();
        redrawCanvas();
    }

    init();
});