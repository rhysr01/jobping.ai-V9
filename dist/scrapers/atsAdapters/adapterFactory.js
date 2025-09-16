"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterFactory = void 0;
const greenhouseAdapter_1 = require("./greenhouseAdapter");
class AdapterFactory {
    static getAdapter(platform) {
        if (this.adapters.has(platform)) {
            return this.adapters.get(platform);
        }
        let adapter;
        switch (platform.toLowerCase()) {
            case 'greenhouse':
                adapter = new greenhouseAdapter_1.GreenhouseAdapter();
                break;
            // Add more adapters as they're implemented
            // case 'smartrecruiters':
            //   adapter = new SmartRecruitersAdapter();
            //   break;
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
        this.adapters.set(platform, adapter);
        return adapter;
    }
    static getSupportedPlatforms() {
        return ['greenhouse'];
    }
}
exports.AdapterFactory = AdapterFactory;
AdapterFactory.adapters = new Map();
