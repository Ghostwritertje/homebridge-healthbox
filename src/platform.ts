import {API, Characteristic, DynamicPlatformPlugin, HapStatusError, Logger, PlatformAccessory, PlatformConfig, Service} from 'homebridge';

import {PLATFORM_NAME, PLUGIN_NAME} from './settings';
import {HealthBoxFanAccessory} from './HealthBoxFanAccessory';
import {HealthBoxAirQualityAccessory} from './HealthBoxAirQualityAccessory';
import {HealthBoxApiService} from './health-box-api-service';
import {HealthBoxInfoResponse} from './model/api/health-box-info-response.http-model';

const DISCOVERY_RETRY_MIN_MS = 30_000;
const DISCOVERY_RETRY_MAX_MS = 10 * 60_000;

export class HealthBoxHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // accessories restored from the Homebridge cache, keyed by UUID
  private readonly cachedAccessories = new Map<string, PlatformAccessory>();

  private readonly healthBoxService: HealthBoxApiService;
  private discoveryRetryMs = DISCOVERY_RETRY_MIN_MS;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.healthBoxService = new HealthBoxApiService(
      String(config['healthBoxUri']).replace(/\/+$/, ''),
      config['boostFanSpeed'] ?? 200,
      config['boostDuration'] ?? 3600,
    );

    this.api.on('didFinishLaunching', () => {
      // wire up cached accessories straight away, so they answer (or report "No Response") even if the Healthbox is down
      for (const accessory of this.cachedAccessories.values()) {
        this.attachHandlers(accessory);
      }
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.debug('Loading accessory from cache:', accessory.displayName);
    this.cachedAccessories.set(accessory.UUID, accessory);
  }

  communicationFailure(): HapStatusError {
    return new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  private async discoverDevices() {
    let info: HealthBoxInfoResponse;
    try {
      info = await this.healthBoxService.getInfo();
    } catch (error) {
      this.log.warn(`Could not reach the Healthbox at ${this.config['healthBoxUri']} (${error}); ` +
        `retrying in ${this.discoveryRetryMs / 1000}s`);
      setTimeout(() => this.discoverDevices(), this.discoveryRetryMs);
      this.discoveryRetryMs = Math.min(this.discoveryRetryMs * 2, DISCOVERY_RETRY_MAX_MS);
      return;
    }

    for (const room of info.room) {
      this.setUpAccessory(info.serial + room.id, room.name, {room, manufacturer: info});
    }
    for (const sensor of info.sensor) {
      this.setUpAccessory(info.serial + sensor['basic id'], sensor.name, {sensor, manufacturer: info});
    }
  }

  private setUpAccessory(id: string, name: string, context: Record<string, unknown>) {
    const uuid = this.api.hap.uuid.generate(id);
    const cached = this.cachedAccessories.get(uuid);
    if (cached) {
      Object.assign(cached.context, context);
      this.api.updatePlatformAccessories([cached]);
      this.log.info('Restored accessory:', name);
    } else {
      const accessory = new this.api.platformAccessory(name, uuid);
      Object.assign(accessory.context, context);
      this.attachHandlers(accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.log.info('Added accessory:', name);
    }
  }

  private attachHandlers(accessory: PlatformAccessory) {
    if (accessory.context.room) {
      new HealthBoxFanAccessory(this, accessory, this.healthBoxService);
    } else if (accessory.context.sensor) {
      new HealthBoxAirQualityAccessory(this, accessory, this.healthBoxService);
    }
  }
}
