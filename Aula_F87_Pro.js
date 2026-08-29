// ==========================================
// METADATA
// ==========================================
export function Name() { return "Aula F87 Pro"; } 
export function VendorId() { return 0x258a; } 
export function ProductId() { return 0x010c; } 
export function Publisher() { return "Aula Community"; } 
export function Size() { return [17, 6]; }
export function Type() { return "Keyboard"; } // Thêm dòng này để app nhận diện đúng loại

// ==========================================
// VALIDATION (Giữ nguyên logic bồ tìm được)
// ==========================================
export function Validate(endpoint) {
    return endpoint.interface === 1 && 
           endpoint.usage === 0x0001 && 
           endpoint.usage_page === 0xff00 && 
           endpoint.collection === 0x0006;
}

// ==========================================
// PARAMETERS
// ==========================================
export function ControllableParameters() {
    return [
        {property:"shutdownColor", group:"lighting", label:"Shutdown Color", min:"0", max:"360", type:"color", default:"#000000"},
        {property:"LightingMode", group:"lighting", label:"Lighting Mode", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
        {property:"forcedColor", group:"lighting", label:"Forced Color", min:"0", max:"360", type:"color", default:"#009bde"}
    ];
}

// ==========================================
// LAYOUT MAPPING (85 Keys mapped)
// ==========================================
const vKeyNames = [
    "Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Print Screen", "Scroll Lock", "Pause Break",
    "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Insert", "Home", "Page Up",
    "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del", "End", "Page Down",
    "CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
    "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow",
    "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow"
];

const vKeys = [
    0, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96,
    1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 85, 91, 97,
    2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86, 92, 98,
    3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 81,
    4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 82, 94,
    5, 11, 17, 35, 53, 59, 65, 83, 89, 95, 101
];

const vKeyPositions = [
    [0, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [13, 3],
    [0, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [13, 4], [15, 4],
    [0, 5], [1, 5], [2, 5], [6, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5]
];

// ==========================================
// LIFECYCLE FUNCTIONS
// ==========================================
export function Initialize() {
    device.setName("Aula F87 Pro");
    // Fix: Dùng setupLeds thay vì setControllableLeds
    device.setupLeds(vKeyNames, vKeyPositions); 
}

export function Render() {
    sendColors(false);
}

export function Shutdown(SystemSuspending) {
    sendColors(true);
}

// ==========================================
// CORE HID LOGIC
// ==========================================
function sendColors(shutdown = false) {
    let rgbdata = [];

    for (let iIdx = 0; iIdx < vKeys.length; iIdx++) {
        let iPxX = vKeyPositions[iIdx][0];
        let iPxY = vKeyPositions[iIdx][1];
        let color;

        if (shutdown) {
            color = hexToRgb(typeof shutdownColor !== 'undefined' ? shutdownColor : "#000000");
        } else if (typeof LightingMode !== 'undefined' && LightingMode === "Forced") {
            color = hexToRgb(typeof forcedColor !== 'undefined' ? forcedColor : "#009bde");
        } else {
            color = device.color(iPxX, iPxY);
        }

        let iLedIdx = vKeys[iIdx] * 3;
        rgbdata[iLedIdx] = color[0];
        rgbdata[iLedIdx + 1] = color[1];
        rgbdata[iLedIdx + 2] = color[2];
    }

    // Đảm bảo mảng RGB đủ 306 bytes (102 LEDs * 3)
    for (let i = 0; i < 306; i++) {
        if (rgbdata[i] === undefined) rgbdata[i] = 0;
    }

    // Header packet
    let packet = [0x06, 0x08, 0x00, 0x00, 0x01, 0x00, 0x7a, 0x01];
    packet = packet.concat(rgbdata); // Tổng: 8 + 306 = 314 bytes

    // FIX QUAN TRỌNG: Pad thêm số 0 để đủ 520 bytes nếu phần cứng yêu cầu gói tin 520
    while (packet.length < 520) {
        packet.push(0x00);
    }

    // FIX CÚ PHÁP: SignalRGB v2.5+ dùng sendReport(ReportID, Data) hoặc send_report(Data)
    // Nếu 0x06 là Report ID, ta tách nó ra. Nếu không, dùng send_report.
    // Ở đây tui dùng cách an toàn nhất cho driver Sinowealth:
    device.send_report(packet, 520); 
    
    // Nếu app báo lỗi send_report, hãy thử đổi sang: device.sendReport(0x06, packet.slice(1));
    
    device.pause(1); // Tránh nghẽn luồng HID
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    let colors = [];
    if (result) {
        colors[0] = parseInt(result[1], 16);
        colors[1] = parseInt(result[2], 16);
        colors[2] = parseInt(result[3], 16);
    } else {
        colors = [0, 0, 0];
    }
    return colors;
}
