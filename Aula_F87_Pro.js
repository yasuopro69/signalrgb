import DeviceDiscovery from "@SignalRGB/DeviceDiscovery";
export function Name() { return "Sinowealth Device"; }
export function VendorId() { return 0x258a; }
export function ProductId() { return Object.keys(SINOWEALTHdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/sinowealth"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF00 && endpoint.collection === 0x0006; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

export function Initialize() {
	SINOWEALTH.Initialize();
}

export function Render() {
	SINOWEALTH.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	SINOWEALTH.sendColors(color);
}

export class SINOWEALTH_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "SINOWEALTH Device",
			DeviceEndpoint: { "interface": 1, "usage": 0x0001, "usage_page": 0xFF00, "collection": 0x0003 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};
	}

	getDeviceProperties(id) {
		const deviceConfig = SINOWEALTHdeviceLibrary.LEDLibrary[id];

		if(!deviceConfig) {
			console.log(`Unknown Device ID: [${id}]. Reach out to support@signalrgb.com, or visit our Discord to get it added.`);
		}

		return deviceConfig;
	};

	getModelID() { return this.Config.ModelID; }
	setModelID(modelid) { this.Config.ModelID = modelid; }

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getLedLayout() { return this.Config.layout; }
	setLedLayout(layout) { this.Config.layout = layout; }

	getLedNames() { return this.Config.LedNames; }
	setLedNames(ledNames) { this.Config.LedNames = ledNames; }

	getLedPositions() { return this.Config.LedPositions; }
	setLedPositions(ledPositions) { this.Config.LedPositions = ledPositions; }

	getLeds() { return this.Config.Leds; }
	setLeds(leds) { this.Config.Leds = leds; }

	getDeviceImage(deviceModel) { return SINOWEALTHdeviceLibrary.LEDLibrary[deviceModel].image; }

	Initialize() {
		this.setDeviceProductId(device.productId());
		const modelID = this.fetchFirmwareData();
		const DeviceProperties = this.getDeviceProperties(modelID);

		if(DeviceProperties){
			this.setModelID(modelID);
			this.setDeviceName(DeviceProperties.name);
			this.setLedLayout(DeviceProperties.layout);
			this.setLedNames(SINOWEALTHdeviceLibrary.LEDLayout[this.getLedLayout()].vLedNames);
			this.setLedPositions(SINOWEALTHdeviceLibrary.LEDLayout[this.getLedLayout()].vLedPositions);
			this.setLeds(SINOWEALTHdeviceLibrary.LEDLayout[this.getLedLayout()].vLeds);

			device.log(`Device model found: ` + this.getDeviceName());
			device.setName(this.getDeviceName());
			device.setSize(SINOWEALTHdeviceLibrary.LEDLayout[this.getLedLayout()].size);
			device.setControllableLeds(this.getLedNames(), this.getLedPositions());
			device.setImageFromUrl(this.getDeviceImage(modelID));
		}else{
			device.notify("Unknown device", `Reach out to support@signalrgb.com, or visit our Discord to get it added.`, 1);
			console.log("Model not found in library!");
			console.log("Unknown protocol for "+ modelID);

			DeviceDiscovery.foundVirtualDevice({
				type: "keyboard",
				name: modelID,
				supported: false,
				vendorId: 0x258a
			});
		}
	}

	sendColors(overrideColor) {
		if(!this.getModelID()){
			return;
		}

		const deviceLedPositions = this.getLedPositions();
		const deviceLeds = this.getLeds();
		const RGBData = [];

		for (let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
			const iPxX = deviceLedPositions[iIdx][0];
			const iPxY = deviceLedPositions[iIdx][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else{
				color = device.color(iPxX, iPxY);
			}

			RGBData[(deviceLeds[iIdx]*3)]   = color[0];
			RGBData[(deviceLeds[iIdx]*3)+1] = color[1];
			RGBData[(deviceLeds[iIdx]*3)+2] = color[2];
		}

		this.writeRGBPackage(RGBData);
	}

	writeRGBPackage(data){
		let packet = [0x06, 0x08, 0x00, 0x00, 0x01, 0x00, 0x7A, 0x01];
		packet = packet.concat(data);

		device.send_report(packet, 520);
		device.pause(1);
	}

	fetchFirmwareData() {
		const packet = [0x06, 0x82, 0x01, 0x00, 0x01, 0x00, 0x06];
		device.send_report(packet, 520);
		const firmwareData = device.get_report(packet, 520);
		return firmwareData[13];
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary = {
			0x010c: "SINOWEALTH Device",
		};

		this.LEDLibrary = {
			// ===== ĐÃ THÊM MÃ ID 11 CỦA AULA F87 PRO CHUẨN =====
			11: {
				name: "AULA F87 Pro",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/f75.png",
				layout:	"F87 Pro"
			},
			// ===================================================

			32: {
				name: "Redragon K686 Eisa Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k686-pro.png",
				layout:	"K686 Pro"
			},
			5: {
				name: "Redragon K686 Eisa Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k686-pro.png",
				layout:	"K686 Pro"
			},
			103: {
				name: "Redragon K689 Wyvern Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k689.png",
				layout:	"K689"
			},
			106: {
				name: "Redragon K618 Horus Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k618-pro.png",
				layout:	"K618"
			},
			121: {
				name: "Redragon K580 Vata Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k580.png",
				layout:	"K580"
			},
			160: {
				name: "Redragon K596 Vishnu Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k596-pro.png",
				layout:	"K596"
			},
			164: {
				name: "AULA F99",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/f99.png",
				layout:	"F99"
			},
			88: {
				name: "AULA F99 Pro",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/f99-pro.png",
				layout:	"F99 Pro"
			},
			204: {
				name: "YUNZII AL71",
				image: "https://assets.signalrgb.com/devices/brands/yunzii/keyboards/al71.png",
				layout:	"AL71"
			},
			205: {
				name: "AULA F75",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/f75.png",
				layout:	"F75"
			},
			186: {
				name: "AULA F108",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/f108.png",
				layout:	"F108"
			},
			155: {
				name: "Leobog Hi75",
				image: "https://assets.signalrgb.com/devices/brands/leobog/keyboards/hi75.png",
				layout:	"F75"
			},
			190: {
				name: "Kreo Swarm",
				image: "https://assets.signalrgb.com/devices/brands/kreo/keyboards/swarm.png",
				layout:	"Kreo Swarm"
			},
			170: {
				name: "AULA F65",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/f65.png",
				layout:	"F65"
			},
			180: {
				name: "Gravastar Mercury K1",
				image: "https://assets.signalrgb.com/devices/brands/gravastar/keyboards/mercury-k1-pro.png",
				layout:	"Mercury K1 Pro"
			},
			151: {
				name: "Gravastar Mercury K1 Pro",
				image: "https://assets.signalrgb.com/devices/brands/gravastar/keyboards/mercury-k1-pro.png",
				layout:	"Mercury K1 Pro"
			},
			17: {
				name: "SOLAKAKA Ki99 Pro",
				image: "https://assets.signalrgb.com/devices/brands/solakaka/keyboards/ki99-pro.png",
				layout:	"F99 Pro"
			},
			78: {
				name: "SOLAKAKA K21",
				image: "https://assets.signalrgb.com/devices/brands/solakaka/keyboards/k21.png",
				layout:	"Numpad"
			},
			179: {
				name: "Yunzii YZ98",
				image: "https://assets.signalrgb.com/devices/brands/yunzii/keyboards/yz98.png",
				layout:	"96%"
			},
			34: {
				name: "Yunzii X75",
				image: "https://assets.signalrgb.com/devices/brands/yunzii/keyboards/x75.png",
				layout:	"X75"
			},
			136: {
				name: "Yunzii B68",
				image: "https://assets.signalrgb.com/devices/brands/yunzii/keyboards/b68.png",
				layout:	"B68"
			},
			37: {
				name: "Yunzii X75 PRO",
				image: "https://assets.signalrgb.com/devices/brands/yunzii/keyboards/x75.png",
				layout: "X75"
			},
			119: {
				name: "Yunzii C75",
				image: "https://assets.signalrgb.com/devices/brands/yunzii/keyboards/c75.png",
				layout:	"C75"
			},
			250: {
				name: "Yunzii C98",
				image: "https://assets.signalrgb.com/devices/brands/yunzii/keyboards/c98.png",
				layout:	"C98"
			},
			4: {
				name: "Aikun GX968WR",
				image: "https://assets.signalrgb.com/devices/brands/aikun/keyboards/gx968.png",
				layout:	"GX968"
			},
			127: {
				name: "Royal Kludge 75",
				image: "https://assets.signalrgb.com/devices/brands/royal-kludge/keyboards/rk75.png",
				layout:	"75%"
			},
		};

		this.LEDLayout = {
			// ===== ĐÃ THÊM MAP ĐÈN AULA F87 PRO =====
			"F87 Pro": {
				vLedNames: [
					"Esc",     "F1","F2","F3","F4",   "F5","F6","F7","F8",    "F9", "F10", "F11", "F12",  "Print Screen", "Scroll Lock", "Pause Break",   
					"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",   "-_", "=+",  "Backspace",        "Insert",       "Home",    "Page Up", 
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",     "\\",                 "Del",         "End",     "Page Down",   
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",        "Enter",                                                     
					"Left Shift","Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",         "Right Shift",                     "Up Arrow",                   
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow",   "Down Arrow", "Right Arrow"
				],
				vLeds: [
					0,   12,18,24,30,36,42,48,54,60,66,72,78,84,90,96,   
					1, 7,13,19,25,31,37,43,49,55,61,67,73,79,85,91,97,
					2, 8,14,20,26,32,38,44,50,56,62,68,74,80,86,92,98,
					3, 9,15,21,27,33,39,45,51,57,63,69,   81,	
					4,10,16,22,28,34,40,46,52,58,64,      82,   94,
					5,11,17,      35,      53,59,65,      83,89,95,101
				],
				vLedPositions: [
					[0, 0],       [2, 0],[3, 0],[4, 0],[5, 0], [6, 0],[7, 0], [8, 0], [9, 0], [10, 0],[11, 0],[12, 0],[13, 0],[14, 0],[15, 0],[16, 0],
					[0, 1],[1, 1],[2, 1],[3, 1],[4, 1],[5, 1], [6, 1],[7, 1], [8, 1], [9, 1], [10, 1],[11, 1],[12, 1],[13, 1],[14, 1],[15, 1],[16, 1],
					[0, 2],[1, 2],[2, 2],[3, 2],[4, 2],[5, 2], [6, 2],[7, 2], [8, 2], [9, 2], [10, 2],[11, 2],[12, 2],[13, 2],[14, 2],[15, 2],[16, 2],
					[0, 3],[1, 3],[2, 3],[3, 3],[4, 3],[5, 3], [6, 3],[7, 3], [8, 3], [9, 3], [10, 3],[11, 3],        [13, 3],
					[0, 4],       [2, 4],[3, 4],[4, 4],[5, 4], [6, 4],[7, 4], [8, 4], [9, 4], [10, 4],[11, 4],    [13, 4],            [15, 4],
					[0, 5],[1, 5],[2, 5],                      [6, 5],                        [10, 5],[11, 5],[12, 5],[13, 5],[14, 5],[15, 5],[16, 5]
				],
				size: [17, 6]
			},
			// ==========================================================

			"96%": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", 			"Backspace",	"NumLock", "/", "*", "-",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         				"Num 7", "Num 8", "Num 9", "+",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   				"Enter",	"Num 4", "Num 5", "Num 6",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	"Right Shift", "Up Arrow",	"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."
				],
				vLeds:  [
					0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91, 97, 103, 109,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92, 98, 104, 110,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93, 99, 105,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    70, 82, 88, 94, 100, 112,
					5, 11, 17,			35,			53, 59, 65, 83, 89, 95, 	101, 107,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3], [15, 3], [16, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
				],
				size: [18, 6],
			},

			"75%": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",  "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         "Page Up",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   "Enter",      "Page Down",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "AltGr", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow",
					"ISO_<", "ISO_#"
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    82, 88,
					5, 11, 17,			35,			  53, 59, 65, 83, 89, 95,
					70, 75
				],
				vLedPositions: [
					[0, 0], 		[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
					[1, 4], [12, 3]
				],
				size: [15, 6],
			},
			"Numpad": {
				vLedNames: [
					"Esc", "Tab", "Backspace", "Fn",
					"NumLock", "Num /", "Num *", "Num -",
					"Num 7", "Num 8", "Num 9", "Num +",
					"Num 4", "Num 5", "Num 6",
					"Num 1", "Num 2", "Num 3", "Enter",
					"Num 0", "Num .",
				],
				vLeds: [
					102, 108, 114, 120,
					103, 109, 115, 121,
					104, 110, 116, 122,
					105, 111, 117,
					106, 112, 118, 124,
					107,     119,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0],
					[0, 1], [1, 1], [2, 1], [3, 1],
					[0, 2], [1, 2], [2, 2], [3, 2],
					[0, 3], [1, 3], [2, 3],
					[0, 4], [1, 4], [2, 4], [3, 4],
					[0, 5],		[2, 5],
				],
				size: [4, 6],
			},

			// Custom
			"AL71": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Ins", "Home",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "End", "PgUp",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", "Delete", "PgDn",
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift", "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Left Space", "Space", "Right Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 85, 91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86, 92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 	  81, 87, 93,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 	  82, 88,
					5, 11, 17, 23,        35, 	  47, 53, 59, 65, 77, 83, 89, 95,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], [14, 2], [15, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],		   [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4], [3, 4],         [5, 4],					[8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4]
				],
				size: [16, 5],
			},

			"F75": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",  "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         "Page Up",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   "Enter",      "Page Down",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "End",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 85,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 87,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    70, 82, 88,
					5, 11, 17,			35,				53, 59,   77, 83, 89
				],
				vLedPositions: [
					[0, 0], 		[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], 		  [12, 5], [13, 5], [14, 5],
				],
				size: [15, 6],
			},

			"F99": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del",		"Home",  "End",  "Pgup", "Pgdn",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", 			"Backspace",	"NumLock", "/", "*", "-",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         				"Num 7", "Num 8", "Num 9", "+",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   				"Enter",	"Num 4", "Num 5", "Num 6",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	"Right Shift", "Up Arrow",	"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."
				],
				vLeds:  [
					0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 90, 96, 102, 108,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91, 97, 103, 109,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92, 98, 104, 110,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93, 99, 105,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    82, 88, 94, 100, 106, 112,
					5, 11, 17,			35,			53, 59, 65, 83, 89, 95, 	101, 107,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3], [15, 3], [16, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
				],
				size: [18, 6],
			},
			"F99 Pro": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del",	"Scroll",  "Pause",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+",	"Backspace", "Home", "NumLock", "/", "*", "-",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",           "PgUp", "Num 7", "Num 8", "Num 9", "+",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",			"Enter", "PgDn", "Num 4", "Num 5", "Num 6",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow",	 "Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."
				],
				vLeds:  [
					0, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,	  84, 90, 96,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 85, 91, 97, 103, 109,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86, 92, 98, 104, 110,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 	  81, 87, 93, 99, 105,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    82, 88, 94, 100, 106, 112,
					5, 11, 17,			35,				53, 59, 65, 83, 89, 95, 101, 107,
				],
				vLedPositions: [
					[0, 0], 		[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 0], [15, 1], [16, 1], [17, 1], [18, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 0], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3], [15, 3], [16, 3], [17, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], 		 [15, 4], [16, 4], [17, 4], [18, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
				],
				size: [19, 6],
			},
			"K596": {
				vLedNames: [
						  "Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",			"Print Screen",	"Scroll Lock",	"Pause Break",
					"G1", "`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",		"Insert",		"Home",			"Page Up",
					"G2", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",					"Del",			"End",			"Page Down",
					"G3", "CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",  			"Enter",
					"G4", "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",							"Up Arrow",
					"G5", "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",	"Left Arrow",	"Down Arrow", "Right Arrow",
				],
				vLeds:  [
						 0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 	 84, 90, 96,
					103, 1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	 85, 91, 97,
					104, 2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	 86, 92, 98,
					105, 3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,
					106, 4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64,	   82, 		 94,
					107, 5, 11, 17,			   35,			   53, 59, 65, 83,	 89, 95, 101,
				],
				vLedPositions: [
						    [1, 0],			[3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], 	[15, 0], [16, 0], [17, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],	[15, 1], [16, 1], [17, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], 	[15, 2], [16, 2], [17, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], 			[14, 3],
					[0, 4], [1, 4], 		[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],  		             [16, 4],
					[0, 5], [1, 5], [2, 5], [3, 5],                                 [8, 5],                  [11, 5], [12, 5], [13, 5], [14, 5], 	[15, 5], [16, 5], [17, 5],
				],
				size: [18, 6],
			},
			"K580": {
				vLedNames: [
					"Esc",     "F1", "F2", "F3", "F4",   "F5", "F6", "F7", "F8",    "F9", "F10", "F11", "F12",		"Print Screen",	"Scroll Lock",	"Pause Break",
					"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",				"Insert",		"Home",			"Page Up",		"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",						"Del",			"End",			"Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", 			 "Enter",															"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	  "Right Shift",							"Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",			"Left Arrow",	"Down Arrow",	"Right Arrow",	"Num 0",		  "Num .",
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 	 84, 90, 96,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	 85, 91, 97,	103, 109, 115, 121,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	 86, 92, 98,	104, 110, 116, 122,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,					105, 111, 117,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64,	   82, 		 94,		106, 112, 118, 124,
					5, 11, 17,			   35,			   53, 59, 65, 83,	 89, 95, 101,	107,    119,
				],
				vLedPositions: [
					[0, 0],			[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [ 9, 0], [11, 0], [12, 0], [13, 0],		[14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],		[14, 1], [15, 1], [16, 1],		[17, 1], [18, 1], [19, 1], [20, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],		[14, 2], [15, 2], [16, 2],		[17, 2], [18, 2], [19, 2], [20, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],										[17, 3], [18, 3], [19, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4],				 [15, 4],				[17, 4], [18, 4], [19, 4], [20, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],		[14, 5], [15, 5], [16, 5],		[17, 5],		  [19, 5],
				],
				size: [21, 6],
			},
			"K618": {
				vLedNames: [
					"Logo 1", "Logo 2", "Logo 3",
					"Esc",     "F1", "F2", "F3", "F4",   "F5", "F6", "F7", "F8",    "F9", "F10", "F11", "F12",		"Print Screen",	"Scroll Lock",	"Pause Break",
					"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",				"Insert",		"Home",			"Page Up",		"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",						"Del",			"End",			"Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", 			 "Enter",															"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	  "Right Shift",							"Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",			"Left Arrow",	"Down Arrow",	"Right Arrow",	"Num 0",		  "Num .",
				],
				vLeds:  [
					102, 100, 99,
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 	 84, 90, 96,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	 85, 91, 97,	103, 109, 115, 121,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	 86, 92, 98,	104, 110, 116, 122,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,					105, 111, 117,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64,	   82, 		 94,		106, 112, 118, 124,
					5, 11, 17,			   35,			   53, 59, 65, 83,	 89, 95, 101,	107,    119,
				],
				vLedPositions: [
					[5, 0], [6, 0], [7, 0],
					[0, 1],			[2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],		[14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],		[14, 2], [15, 2], [16, 2],		[17, 2], [18, 2], [19, 2], [20, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],		[14, 3], [15, 3], [16, 3],		[17, 3], [18, 3], [19, 3], [20, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], 		   [13, 4],										[17, 4], [18, 4], [19, 4],
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],		   [13, 5],				 [15, 5],				[17, 5], [18, 5], [19, 5], [20, 5],
					[0, 6], [1, 6], [2, 6],							[6, 6],							[10, 6], [11, 6], [12, 6], [13, 6],		[14, 6], [15, 6], [16, 6],		[17, 6],		  [19, 6],
				],
				size: [21, 7],
			},
			"K686 Pro": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del",		"Home",  "End",  "Pgup",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", 			"Backspace",	"NumLock", "/", "*", "-",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         				"Num 7", "Num 8", "Num 9", "+",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   				"Enter",	"Num 4", "Num 5", "Num 6",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	"Right Shift", "Up Arrow",	"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."
				],
				vLeds:  [
					0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 90, 96, 102,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91, 97, 103, 109,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92, 98, 104, 110,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93, 99, 105,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    70, 82, 88, 94, 100, 112,
					5, 11, 17,			35,			53, 59, 65, 83, 89, 95, 	101, 107,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3], [15, 3], [16, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
				],
				size: [18, 6],
			},
			"F65": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Home",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "PgUp",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", 	"PgDn",
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "End",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Fn", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	  91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	  92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 	  81, 	  93,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 	  82, 88, 94,
					5, 11, 17,			  35, 	  	  		  65, 77, 83, 89, 95,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], 		 [15, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], 		 [15, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], 		 [15, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],		   [13, 3], [14, 3], [15, 3],
					[0, 4], [1, 4], [2, 4], 				[5, 4],											 [11, 4], [12, 4], [13, 4], [14, 4], [15, 4]
				],
				size: [16, 5],
			},
			"K689": {
				vLedNames: [
					"Esc",     "F1", "F2", "F3", "F4",   "F5", "F6", "F7", "F8",    "F9", "F10", "F11", "F12",		"Print Screen",	"Scroll Lock",	"Pause Break",	"MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",				"Insert",		"Home",			"Page Up",		"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",						"Del",			"End",			"Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", 			 "Enter",															"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	  "Right Shift",							"Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",			"Left Arrow",	"Down Arrow",	"Right Arrow",	"Num 0",		  "Num .",
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 	 84, 90, 96,	102, 108, 114, 120,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	 85, 91, 97,	103, 109, 115, 121,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	 86, 92, 98,	104, 110, 116, 122,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,					105, 111, 117,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64,	   82, 		 94,		106, 112, 118, 124,
					5, 11, 17,			   35,			   53, 59, 65, 83,	 89, 95, 101,	107,    119,
				],
				vLedPositions: [
					[0, 0],			[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [ 9, 0], [11, 0], [12, 0], [13, 0],		[14, 0], [15, 0], [16, 0],		[17, 0], [18, 0], [19, 0], [20, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],		[14, 1], [15, 1], [16, 1],		[17, 1], [18, 1], [19, 1], [20, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],		[14, 2], [15, 2], [16, 2],		[17, 2], [18, 2], [19, 2], [20, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],										[17, 3], [18, 3], [19, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4],				 [15, 4],				[17, 4], [18, 4], [19, 4], [20, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],		[14, 5], [15, 5], [16, 5],		[17, 5],		  [19, 5],
				],
				size: [21, 6],
			},
			"Mercury K1 Pro": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",  "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         "Page Up",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   "Enter",      "Page Down",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn",   "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93,
					4,    16, 22, 28, 34, 40, 46, 52, 58, 64, 70, 82, 88,
					5, 11, 17,			35,			  53, 59, 83, 89, 95,

				],
				vLedPositions: [
					[0, 0], 		[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [12, 5], [13, 5], [14, 5],

				],
				size: [15, 6],
			},
			"X75": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Pause Break",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",  "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         "Page Up",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   "Enter",      "Page Down",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Print Screen",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow",

				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,         90,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,         91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,         92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,         93,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 82,            88, 94,
					5, 11, 17,		35,		  53, 59, 65, 83, 89, 95,

				],
				vLedPositions: [
					[0, 0], 	[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 	[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],			[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],

				],
				size: [15, 6],
			},
			"B68": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", 	"Page Up",
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Page Down",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn",  "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	  92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 	  81, 	  93,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64,     82, 88, 94,
					5, 11, 17,		35, 	  	  53, 59, 83, 89, 95,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], [14, 2],
					[0, 3],		[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4], 		[5, 4],				[9, 4], [10, 4],          [12, 4], [13, 4], [14, 4],
				],
				size: [15, 5],
			},
			"C75": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",   "Print Screen", "Pause Break", "Del",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                                 "Home",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",                                         "End",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   "Enter",                                 "Page Up",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                "Up Arrow",   "Page Down",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow",

				],
				vLeds:  [
					0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,     84, 90,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,         91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,         92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,         93,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 82,            88, 94,
					5, 11, 17,		35,		  53, 59, 65, 83, 89, 95,

				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 	[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],			[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],

				],
				size: [16, 6],
			},
			"C98": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",                     "Del", "Home", "End", "Page Up", "Page Down",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                             "NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",          "\\",                               "Num 7", "Num 8", "Num 9", "Num +",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",      "Enter",	                        "Num 4", "Num 5", "Num 6",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",   "Right Shift",              "Up Arrow",      "Num 1", "Num 2", "Num 3", "Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",
				],
				vLeds:  [
					0, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91, 97, 103, 109,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92, 98, 104, 110,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93, 99, 105,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    82,	88, 94, 100, 106, 112,
					5, 11, 17,			35,			53, 59, 65, 83, 89, 95, 	101, 107,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3], [15, 3], [16, 3],
					[0, 4], 	[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
            			],
				size: [18, 6],
			},
			"F108": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",			"Print Screen",	"Scroll Lock",	"Pause Break",
					"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-_",   "=+",  "Backspace",			"Insert",		"Home",			"Page Up",		"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",						"Del",			"End",			"Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", 			 "Enter",														"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	  "Right Shift",							"Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",			"Left Arrow",	"Down Arrow",	"Right Arrow",	"Num 0",		  "Num .",
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 	 84, 90, 96,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	 85, 91, 97,	103, 109, 115, 121,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	 86, 92, 98,	104, 110, 116, 122,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,					105, 111, 117,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64,	   82, 		 94,		106, 112, 118, 124,
					5, 11, 17,			   35,			   53, 59, 65, 83,	 89, 95, 101,	107,    119,
				],
				vLedPositions: [
					[0, 0],			[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],		[14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],		[14, 1], [15, 1], [16, 1],		[17, 1], [18, 1], [19, 1], [20, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],		[14, 2], [15, 2], [16, 2],		[17, 2], [18, 2], [19, 2], [20, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],										[17, 3], [18, 3], [19, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4],				 [15, 4],				[17, 4], [18, 4], [19, 4], [20, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],		[14, 5], [15, 5], [16, 5],		[17, 5],		  [19, 5],
				],
				size: [21, 6],
			},
			"Kreo Swarm": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Print",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",  "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         "Page Up",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   "Enter",      "Page Down",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "End",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    82, 88, 94,
					5, 11, 17,			35,			53,	59, 65,   83, 89, 95,
				],
				vLedPositions: [
					[0, 0], 		[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],			[8, 5],	[9, 5], [10, 5], 		  [12, 5], [13, 5], [14, 5],
				],
				size: [15, 6],
			},
			"GX968": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Ins",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", 	"PgUp",
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "PgDn",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "AltGr", "Fn", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	  91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	  92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 	  81, 	  93,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 	  82, 88, 94,
					5, 11, 17,		35, 	  	 53, 59, 65, 83, 89, 95,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], 	 [15, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], 	 [15, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], 	 [15, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],	   [13, 3], [14, 3], [15, 3],
					[0, 4], [1, 4], [2, 4], 					[6, 4],			[10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4],
				],
				size: [16, 5],
			},
		};
	}
}

const SINOWEALTHdeviceLibrary = new deviceLibrary();
const SINOWEALTH = new SINOWEALTH_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
