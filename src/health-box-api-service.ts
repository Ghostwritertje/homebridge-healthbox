import {HealthBoxBoostResponse} from './model/api/health-box-boost-response.http-model';
import {HealthBoxInfoResponse} from './model/api/health-box-info-response.http-model';

const REQUEST_TIMEOUT_MS = 2000; // stay under Homebridge's 3s "slow read handler" warning

export class HealthBoxApiService {
  private readonly INFO_API = '/v1/api/data/current';
  private readonly GLOBAL_SENSOR_API = '/v2/api/data/current/sensor/';
  private readonly BOOST_API = '/v2/api/boost/';

  constructor(
    private readonly healthBoxUrl: string,
    private readonly boostFanSpeed: number,
    private readonly boostDuration: number,
  ) {
  }

  getInfo(): Promise<HealthBoxInfoResponse> {
    return this.request<HealthBoxInfoResponse>(this.INFO_API);
  }

  async getHealthSensor(id: number): Promise<number> {
    return Number(await this.request<number | string>(this.GLOBAL_SENSOR_API + id + '/parameter/index/value'));
  }

  getBoost(id: number): Promise<HealthBoxBoostResponse> {
    return this.request<HealthBoxBoostResponse>(this.BOOST_API + id);
  }

  boost(id: number, on: boolean): Promise<HealthBoxBoostResponse> {
    return this.request<HealthBoxBoostResponse>(this.BOOST_API + id, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({'enable': on, 'level': this.boostFanSpeed, 'timeout': this.boostDuration}),
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(this.healthBoxUrl + path, {...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
    if (!response.ok) {
      throw new Error(`HealthBox ${init.method ?? 'GET'} ${path} returned HTTP ${response.status}`);
    }
    return await response.json() as T;
  }
}
