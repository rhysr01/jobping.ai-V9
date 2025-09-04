import { SourceAdapter } from '../types';
import { GreenhouseAdapter } from './greenhouseAdapter';

export class AdapterFactory {
  private static adapters = new Map<string, SourceAdapter>();

  static getAdapter(platform: string): SourceAdapter {
    if (this.adapters.has(platform)) {
      return this.adapters.get(platform)!;
    }

    let adapter: SourceAdapter;

    switch (platform.toLowerCase()) {
      case 'greenhouse':
        adapter = new GreenhouseAdapter();
        break;
      // Add more adapters as they're implemented
      // case 'workday':
      //   adapter = new WorkdayAdapter();
      //   break;
      // case 'smartrecruiters':
      //   adapter = new SmartRecruitersAdapter();
      //   break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    this.adapters.set(platform, adapter);
    return adapter;
  }

  static getSupportedPlatforms(): string[] {
    return ['greenhouse'];
  }
}
