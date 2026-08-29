// ==========================================
// METADATA (Giữ nguyên VID/PID để bắt thiết bị)
// ==========================================
export function Name() { return "Aula F87 Pro (Community Fix)"; } 
export function VendorId() { return 0x258a; } 
export function ProductId() { return 0x010c; } 
export function Publisher() { return "Community (Nollie/Skikdd Adapted)"; } 
export function Type() { return "Keyboard"; }

// ==========================================
// PARAMETERS (Giữ lại dropdown thần thánh của code cũ)
// ==========================================
export function ControllableParameters() {
    return [
        {property:"shutdownColor", group:"lighting", label:"Shutdown Color", type:"color", default:"#000000"},
        {property:"LightingMode", group:"lighting", label:"Lighting Mode", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
        {property:"forcedColor", group:"lighting", label:"Forced Color", type:"color", default:"#009bde"},
        {property:"boardModel", group:"lighting", label:"Keyboard Model", type:"combobox", values:["Aula_F87Pro", "Aula_F87", "Aula_F75", "Aula_F99"], default:"Aula_F87Pro"}
    ];
}

// ==========================================
// VALIDATION (Dùng logic "dễ tính" nhưng hiệu quả của code cũ)
// ==========================================
export function Validate(endpoint) {
    return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00;
}

// ==========================================
// LAYOUT DATABASE (Lấy trực tiếp từ code cũ đã được kiểm chứng)
// ==========================================
const boards = {
    Aula_F87Pro: {
        name: "Aula F87 Pro",
        vKeyNames: ["Esc","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","Print Screen","Scroll Lock","Pause Break","`","1","2","3","4","5","6","7","8","9","0","-_","=+","Backspace","Insert","Home","Page Up","Tab","Q","W","E","R","T","Y","U","I","O","P","[","]","\\","Del","End","Page Down","CapsLock","A","S","D","F","G","H","J","K","L",";","'","Enter","Left Shift","Z","X","C","V","B","N","M",",",".","/","Right Shift","Up Arrow","Left Ctrl","Left Win","Left Alt","Space","Right Alt","Fn","Menu","Right Ctrl","Left Arrow","Down Arrow","Right Arrow"],
        vKeys: [0,12,18,24,30,36,42,48,54,60,66,72,78,84,90,96, 1,7,13,19,25,31,37,43,49,55,61,67,73,79,85,91,97, 2,8,14,20,26,32,38,44,50,56,62,68,74,80,86,92,98, 3,9,15,21,27,33,39,45,51,57,63,69,81, 4,10,16,22,28,34,40,46,52,58,64,82,94, 5,11,17,35,53,59,65,83,89,95,101],
        vKeyPositions: [[0,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0], [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1],[16,1], [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],[15,2],[16,2], [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[13,3], [0,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[13,4],[15,4], [0,5],[1,5],[2,5],[6,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],[16,5]],
        size: [17, 6]
    },
    // (Có thể thêm F87, F75, F99 vào đây nếu cần, giữ code gọn nên tui chỉ để F87Pro làm mặc định)
};

let currentBoard = boards["Aula_F87Pro"];

// ==========================================
// LIFECYCLE FUNCTIONS
// ==========================================
export function Initialize() {
    applyBoardModel();
}

export function Render() {
    sendColors(false);
}

export function Shutdown(SystemSuspending) {
    sendColors(true);
}

// ==========================================
// CORE LOGIC (Kết hợp logic cũ + Padding 520 bytes mới)
// ==========================================
function applyBoardModel() {
    // SignalRGB sẽ tự động cập nhật biến 'boardModel' từ Parameters
    let selectedModel = typeof boardModel !== 'undefined' ? boardModel : "Aula_F87Pro";
    
    // Fallback nếu model không tồn tại trong database
    if (!boards[selectedModel]) {
        selectedModel = "Aula_F87Pro";
    }
    
    currentBoard = boards[selectedModel];
    
    device.setName(currentBoard.name);
    device.setSize(currentBoard.size);
    // Dùng setupLeds thay vì setControllableLeds để tương thích tốt hơn với v2.5+
    device.setupLeds(currentBoard.vKeyNames, currentBoard.vKeyPositions);
    device.log(`[Aula Plugin] Model loaded successfully: ${currentBoard.name}`);
}

function sendColors(shutdown = false) {
    // Đảm bảo layout được cập nhật nếu người dùng đổi dropdown
    applyBoardModel(); 

    let rgbdata = [];
    const vKeys = currentBoard.vKeys;
    const vKeyPositions = currentBoard.vKeyPositions;

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

    // Đảm bảo mảng RGB không bị undefined
    for (let i = 0; i < 306; i++) {
        if (rgbdata[i] === undefined) rgbdata[i] = 0;
    }

    // Header packet chuẩn Sinowealth
    let packet = [0x06, 0x08, 0x00, 0x00, 0x01, 0x00, 0x7a, 0x01];
    packet = packet.concat(rgbdata);

    // 🔥 FIX QUAN TRỌNG: Padding lên 520 bytes để tránh crash driver USB
    while (packet.length < 520) {
        packet.push(0x00);
    }

    device.send_report(packet, 520);
    device.pause(1);
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ];
    }
    return [0, 0, 0]; // Fallback an toàn
}
