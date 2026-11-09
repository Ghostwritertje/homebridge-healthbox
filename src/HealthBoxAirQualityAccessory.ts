import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {HealthBoxHomebridgePlatform} from './platform';
import {HealthBoxApiService} from './health-box-api-service';

/**
 * Maps the Healthbox air quality index (0-100, higher is worse) to HomeKit AirQuality (1 = excellent .. 5 = poor).
 */
export class HealthBoxAirQualityAccessory {
  private readonly service: Service;
  private readonly sensorId: number;

  constructor(
    private readonly platform: HealthBoxHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly healthBoxService: HealthBoxApiService,
  ) {
    this.sensorId = accessory.context.sensor['basic id'];

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Renson')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.manufacturer.description ?? 'Healthbox')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.manufacturer.serial);

    this.service = this.accessory.getService(this.platform.Service.AirQualitySensor)
      || this.accessory.addService(this.platform.Service.AirQualitySensor);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.sensor.name);

    this.service.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getAirQuality.bind(this));
  }

  private async getAirQuality(): Promise<CharacteristicValue> {
    try {
      const index = await this.healthBoxService.getHealthSensor(this.sensorId);
      return Math.min(5, Math.max(1, Math.round(index / 20)));
    } catch (error) {
      this.platform.log.debug(`Could not read air quality sensor ${this.sensorId}: ${error}`);
      throw this.platform.communicationFailure();
    }
  }
}
