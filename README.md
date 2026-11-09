# HealthBox Homebridge Plugin

A Homebridge plugin that brings a Renson Healthbox 3 into Apple Home over the Healthbox's local API.

- **One fan per room** (`Fanv2`). Turning it on starts a boost for that room (`boostFanSpeed`% for `boostDuration`
  seconds); turning it off ends the boost. A Healthbox can never be switched off completely, so "off" just means
  "no boost".
- **Air quality sensor** for the Healthbox's global air quality index (mapped to HomeKit's 1 = excellent … 5 = poor).

If the Healthbox is unreachable the accessories show "No Response" (requests time out after 2 s), and discovery
retries in the background until the Healthbox is back.

Fork of the archived [SuperJoran/homebridge-healthbox](https://github.com/SuperJoran/homebridge-healthbox)
(npm `homebridge-healthbox-plugin` ≤ 1.1.6). Version 2.x is not on npm; install it from the GitHub release.
Upgrading in place from 1.x should keep your accessories, because the accessory IDs are unchanged (not tested; the author
re-paired from scratch).

## Requirements

- Homebridge 1.8+ or 2.x
- Node.js 22.12+, 24 or 26

## Installation

Install the release tarball into the same global `node_modules` that Homebridge uses (drop `sudo` if your npm
global directory is writable, which it is after `hb-service install` on macOS):

    sudo npm install -g https://github.com/Ghostwritertje/homebridge-healthbox/releases/download/v2.0.0/homebridge-healthbox-plugin-2.0.0.tgz

Or build it yourself: `npm install && npm pack` (lints and builds), then `npm install -g ./homebridge-healthbox-plugin-*.tgz`.

Releasing: bump `version`, `npm pack`, tag, then `gh release create vX.Y.Z -R Ghostwritertje/homebridge-healthbox homebridge-healthbox-plugin-X.Y.Z.tgz`.

Then add the platform to `config.json`:

    "platforms": [
        {
            "platform": "HealthBoxHomebridgePlugin",
            "healthBoxUri": "http://192.168.1.3",
            "boostFanSpeed": 200,
            "boostDuration": 3600
        }
    ]

## Development

    npm install
    npm run lint
    npm run build
    # run against a throwaway storage dir; -I allows unauthenticated HAP requests for testing
    node node_modules/homebridge/bin/homebridge.js -I -D -U /tmp/hb-test -P .

## Demo

![demo](.github/images/IMG_1534.PNG)
