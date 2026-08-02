import json
import os
import time


class Plugin(object):
    """AVNav user plugin providing configurable legacy E-Ink display pages."""

    VERSION = '0.2.0'

    @classmethod
    def pluginInfo(cls):
        return {
            'description': 'Configurable standalone legacy E-Ink/Tolino display pages',
            'version': cls.VERSION
        }

    def __init__(self, api):
        self.api = api
        self.user_app_id = None
        self.config_file = os.path.join(
            self.api.getDataDir(), 'legacy-display-config.json'
        )
        self.api.registerRequestHandler(self.handleApiRequest)
        if hasattr(self.api, 'registerRestart'):
            self.api.registerRestart(self.stop)

    def default_config(self):
        return {
            'version': 1,
            'dashboards': {
                'anchor': {
                    'title': 'Ankern',
                    'updateInterval': 500,
                    'items': [
                        {'slot': 'main', 'path': 'depth', 'label': 'TIEFE', 'unit': 'm', 'decimals': 1, 'formatter': 'number'},
                        {'slot': 'secondary', 'path': 'speed', 'label': 'GESCHWINDIGKEIT', 'unit': 'kn', 'decimals': 1, 'formatter': 'number'}
                    ]
                },
                'navigation': {
                    'title': 'Navigation',
                    'updateInterval': 1000,
                    'items': [
                        {'slot': 'one', 'path': 'speed', 'label': 'GESCHWINDIGKEIT', 'unit': 'kn', 'decimals': 1, 'formatter': 'number'},
                        {'slot': 'two', 'path': 'track', 'label': 'KURS', 'unit': '°', 'decimals': 0, 'formatter': 'course'},
                        {'slot': 'three', 'path': 'depth', 'label': 'TIEFE', 'unit': 'm', 'decimals': 1, 'formatter': 'number'},
                        {'slot': 'four', 'path': 'satUsed', 'label': 'SATELLITEN', 'unit': '', 'decimals': 0, 'formatter': 'number'}
                    ]
                },
                'system': {
                    'title': 'System',
                    'updateInterval': 3000,
                    'items': [
                        {'slot': 'one', 'path': 'transducers.TempAir', 'label': 'AUSSENTEMP.', 'unit': '°C', 'decimals': 1, 'formatter': 'kelvin'},
                        {'slot': 'two', 'path': 'transducers.Barometer', 'label': 'LUFTDRUCK', 'unit': 'hPa', 'decimals': 1, 'formatter': 'pascalHpa'},
                        {'slot': 'three', 'path': 'signalk.environment.rpi.cpu.temperature', 'label': 'CPU', 'unit': '°C', 'decimals': 1, 'formatter': 'kelvin'},
                        {'slot': 'four', 'path': 'signalk.environment.rpi.memory.utilisation', 'label': 'RAM', 'unit': '%', 'decimals': 0, 'formatter': 'percent'},
                        {'slot': 'five', 'path': 'signalk.electrical.batteries.service.voltage', 'label': 'BATTERIE', 'unit': 'V', 'decimals': 2, 'formatter': 'number'},
                        {'slot': 'six', 'path': 'signalk.electrical.batteries.service.current', 'label': 'STROM', 'unit': 'A', 'decimals': 2, 'formatter': 'number'}
                    ]
                }
            }
        }

    def validate_config(self, value):
        if not isinstance(value, dict):
            raise ValueError('Konfiguration muss ein Objekt sein')
        dashboards = value.get('dashboards')
        if not isinstance(dashboards, dict):
            raise ValueError('dashboards fehlt')
        for name in ('anchor', 'navigation', 'system'):
            dashboard = dashboards.get(name)
            if not isinstance(dashboard, dict):
                raise ValueError('Dashboard %s fehlt' % name)
            items = dashboard.get('items')
            if not isinstance(items, list):
                raise ValueError('items fehlt bei %s' % name)
            interval = dashboard.get('updateInterval', 1000)
            try:
                interval = int(interval)
            except Exception:
                interval = 1000
            dashboard['updateInterval'] = max(250, min(interval, 60000))
            for item in items:
                if not isinstance(item, dict):
                    raise ValueError('Ungueltiges Anzeigeelement')
                item['slot'] = str(item.get('slot', ''))[:32]
                item['path'] = str(item.get('path', ''))[:300]
                item['label'] = str(item.get('label', ''))[:80]
                item['unit'] = str(item.get('unit', ''))[:20]
                try:
                    item['decimals'] = max(0, min(int(item.get('decimals', 1)), 6))
                except Exception:
                    item['decimals'] = 1
                formatter = str(item.get('formatter', 'number'))
                if formatter not in ('number', 'course', 'kelvin', 'pascalHpa', 'percent', 'text'):
                    formatter = 'number'
                item['formatter'] = formatter
        value['version'] = 1
        return value

    def load_config(self):
        try:
            with open(self.config_file, 'r') as handle:
                return self.validate_config(json.load(handle))
        except Exception:
            return self.default_config()

    def save_config(self, value):
        value = self.validate_config(value)
        directory = os.path.dirname(self.config_file)
        if not os.path.isdir(directory):
            os.makedirs(directory)
        temporary = self.config_file + '.tmp'
        with open(temporary, 'w') as handle:
            json.dump(value, handle, indent=2, sort_keys=True)
            handle.write('\n')
        os.replace(temporary, self.config_file)
        return value

    def arg_value(self, args, name):
        value = args.get(name)
        if isinstance(value, list):
            return value[0] if value else None
        return value

    def handleApiRequest(self, url, handler, args):
        if url in ('config', '/config'):
            return {'status': 'OK', 'config': self.load_config()}
        if url in ('defaults', '/defaults'):
            return {'status': 'OK', 'config': self.default_config()}
        if url in ('saveConfig', '/saveConfig'):
            raw = self.arg_value(args, 'config')
            if raw is None:
                return {'status': 'ERROR', 'error': 'Parameter config fehlt'}
            try:
                config = json.loads(raw)
                saved = self.save_config(config)
                return {'status': 'OK', 'config': saved}
            except Exception as error:
                return {'status': 'ERROR', 'error': str(error)}
        return {'status': 'ERROR', 'error': 'Unbekannter Request: %s' % url}

    def run(self):
        base_url = self.api.getBaseUrl()
        app_url = base_url.rstrip('/') + '/legacy/index.html'
        try:
            self.user_app_id = self.api.registerUserApp(
                app_url,
                'icon.svg',
                title=None,
                preventConnectionLost=True,
                name='legacy-display',
                shortText='Legacy',
                longText='Legacy Display'
            )
            self.api.setStatus('RUNNING', 'Startseite: %s' % app_url)
            self.api.log('Legacy display plugin %s started, URL=%s' % (self.VERSION, app_url))
        except Exception as error:
            self.api.setStatus('ERROR', 'UserApp registration failed: %s' % error)
            self.api.error('Legacy display plugin: %s' % error)
            return
        while not self.api.shouldStopMainThread():
            time.sleep(1)

    def stop(self):
        if self.user_app_id is not None and hasattr(self.api, 'unregisterUserApp'):
            try:
                self.api.unregisterUserApp(self.user_app_id)
            except Exception:
                pass
            self.user_app_id = None
