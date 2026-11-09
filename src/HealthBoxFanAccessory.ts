import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {HealthBoxHomebridgePlatform} from './platform';
import {HealthBoxApiService} from './health-box-api-service';

/**
 * One Fanv2 per room. "Active" means the room's boost is on: a Healthbox can never be switched off,
 * so turning the fan on starts a boost and turning it off ends it.
 */
export class HealthBoxFanAccessory {
  private readonly service: Service;
  private readonly roomId: number;

  constructor(
    private readonly platform: HealthBoxHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly healthBoxService: HealthBoxApiService,
  ) {
    this.roomId = accessory.context.room.id;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Renson')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.manufacturer.description ?? 'Healthbox')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.manufacturer.serial);

    this.service = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.room.name);

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));
  }

  private async setActive(value: CharacteristicValue) {
    const on = value === this.platform.Characteristic.Active.ACTIVE;
    try {
      const result = await this.healthBoxService.boost(this.roomId, on);
      this.platform.log.debug(`Boost ${result.enable ? 'enabled' : 'disabled'} for room ${this.roomId}`);
    } catch (error) {
      this.platform.log.warn(`Could not ${on ? 'enable' : 'disable'} boost for room ${this.roomId}: ${error}`);
      throw this.platform.communicationFailure();
    }
  }

  private async getActive(): Promise<CharacteristicValue> {
    try {
      const boost = await this.healthBoxService.getBoost(this.roomId);
      return boost.enable ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
    } catch (error) {
      this.platform.log.debug(`Could not read boost for room ${this.roomId}: ${error}`);
      throw this.platform.communicationFailure();
    }
  }
}
