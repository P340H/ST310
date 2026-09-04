// Webhook URLs
const WEBHOOK_URL_1 = "https://io.adafruit.com/api/v2/webhooks/feed/xDap2A1jFD1CzCBZDSMQAPf4BKYG";
const WEBHOOK_URL_2 = "https://io.adafruit.com/api/v2/webhooks/feed/PcWvUfJky5r8TKkZ5AmAxVJXubng";

// ===== CALIBRATION / OFFSET SETTINGS =====
const S1_OFFSET = 0;

// Global State
let currentS1 = 0;
let currentS2 = 90;

function vibrate() {
    if ("vibrate" in navigator) {
        navigator.vibrate(35);
    }
}

function showStatus(message, type = 'info') {
    const toast = document.getElementById('statusToast');
    if (!toast) return;

    toast.className = "fixed bottom-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 p-3 rounded-xl text-xs font-semibold text-center border shadow-lg ";

    if (type === 'success') {
        toast.className += "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (type === 'error') {
        toast.className += "bg-rose-50 text-rose-700 border-rose-200";
    } else {
        toast.className += "bg-cyan-50 text-cyan-700 border-cyan-200";
    }

    toast.textContent = message;
    toast.classList.remove('hidden');

    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

function updateVisualizer(s1Angle, s2Angle) {
    const armGroup = document.getElementById('svgArmGroup');

    if (armGroup) {
        armGroup.style.transformOrigin = '120px 180px';
        armGroup.style.transform = `rotate(${-s1Angle}deg)`;
    }

    const jawOffset = (s2Angle / 90) * 15;
    const jawLeft = document.getElementById('svgJawLeft');
    const jawRight = document.getElementById('svgJawRight');

    if (jawLeft) jawLeft.style.transform = `translateX(${-jawOffset}px)`;
    if (jawRight) jawRight.style.transform = `translateX(${jawOffset}px)`;

    document.getElementById('s1Badge').textContent = `${s1Angle}°`;
    document.getElementById('s2Badge').textContent = `${s2Angle}°`;

    document.getElementById('telemetryS1').textContent =
        `${s1Angle}° ${s1Angle <= 20 ? '(UP)' : s1Angle >= 70 ? '(DOWN)' : ''}`;

    document.getElementById('telemetryS2').textContent =
        `${s2Angle}° ${s2Angle >= 80 ? '(OPEN)' : s2Angle <= 10 ? '(CLOSED)' : ''}`;

    document.getElementById('sliderS1').value = s1Angle;
    document.getElementById('sliderValS1').textContent = `${s1Angle}°`;

    document.getElementById('sliderS2').value = s2Angle;
    document.getElementById('sliderValS2').textContent = `${s2Angle}°`;
}

function onSliderS1Input(val) {
    currentS1 = parseInt(val);
    document.getElementById('sliderValS1').textContent = `${currentS1}°`;
    updateVisualizer(currentS1, currentS2);
}

function onSliderS2Input(val) {
    currentS2 = parseInt(val);
    document.getElementById('sliderValS2').textContent = `${currentS2}°`;
    updateVisualizer(currentS1, currentS2);
}

async function sendCommand(url, angle, label) {
    vibrate();
    showStatus(`กำลังส่งคำสั่งไปที่ ${label} ...`, 'info');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: angle }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        showStatus(`ส่งคำสั่ง ${label} สำเร็จ!`, 'success');
        return true;

    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            showStatus(`การเชื่อมต่อหมดเวลา (Timeout) ขณะส่ง ${label}`, 'error');
        } else {
            showStatus(`เกิดข้อผิดพลาดในการส่งคำสั่งไปที่ ${label}`, 'error');
        }

        throw err;
    }
}

function setButtonsDisabled(disabled) {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => {
        b.disabled = disabled;
    });
}

async function handleS1(angle) {
    setButtonsDisabled(true);

    const calibratedAngle = Math.max(
        0,
        Math.min(180, angle + S1_OFFSET)
    );

    currentS1 = angle;
    updateVisualizer(currentS1, currentS2);

    try {
        await sendCommand(
            WEBHOOK_URL_1,
            calibratedAngle,
            'Servo 1 (Arm)'
        );
    } catch (e) {
    } finally {
        setButtonsDisabled(false);
    }
}

async function handleS2(angle) {
    setButtonsDisabled(true);
    currentS2 = angle;
    updateVisualizer(currentS1, currentS2);

    try {
        await sendCommand(WEBHOOK_URL_2, angle, 'Servo 2 (Gripper)');
    } catch (e) {
    } finally {
        setButtonsDisabled(false);
    }
}

async function sendCustomS1() {
    const val = parseInt(
        document.getElementById('sliderS1').value
    );

    await handleS1(val);
}

async function sendCustomS2() {
    const val = parseInt(
        document.getElementById('sliderS2').value
    );

    await handleS2(val);
}

async function handleGrab() {
    setButtonsDisabled(true);

    try {
        await handleS1(90);
        await new Promise(r => setTimeout(r, 600));
        await handleS2(0);

        showStatus(
            'ทำรายการหนีบวัตถุเรียบร้อย (Grabbed)',
            'success'
        );

    } catch (e) {
    } finally {
        setButtonsDisabled(false);
    }
}

async function handleRelease() {
    setButtonsDisabled(true);

    try {
        await handleS1(15);
        await new Promise(r => setTimeout(r, 600));
        await handleS2(90);

        showStatus(
            'ทำรายการปล่อยวัตถุเรียบร้อย (Released)',
            'success'
        );

    } catch (e) {
    } finally {
        setButtonsDisabled(false);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    updateVisualizer(15, 90);
});