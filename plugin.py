import datetime
import json
import os
import time

class Plugin(object):
    VERSION = '0.5.0'

    @classmethod
    def pluginInfo(cls):
        return {'description': 'Configurable E-Ink dashboards with optional server storage', 'version': cls.VERSION}

    def __init__(self, api):
        self.api = api
        self.user_app_id = None
        self.config_file = os.path.join(self.api.getDataDir(), 'legacy-display-config-v3.json')
        self.catalog_file = os.path.join(self.api.getDataDir(), 'legacy-display-catalog-v3.json')
        self.api.registerRequestHandler(self.handleApiRequest)
        if hasattr(self.api, 'registerRestart'):
            self.api.registerRestart(self.stop)

    def _default_path(self):
        return os.path.join(os.path.dirname(__file__), 'defaults', 'dashboards.json')

    def default_config(self):
        with open(self._default_path(), 'r') as handle:
            return json.load(handle)

    def _read_json(self, path, fallback):
        try:
            with open(path, 'r') as handle:
                return json.load(handle)
        except Exception:
            return fallback

    def _atomic_write(self, path, value):
        directory = os.path.dirname(path)
        if not os.path.isdir(directory):
            os.makedirs(directory)
        temporary = path + '.tmp'
        with open(temporary, 'w') as handle:
            json.dump(value, handle, indent=2, sort_keys=True)
            handle.write('\n')
        os.replace(temporary, path)

    def validate_config(self, value):
        if not isinstance(value, dict):
            raise ValueError('Konfiguration muss ein Objekt sein')
        dashboards = value.get('dashboards')
        if not isinstance(dashboards, dict):
            raise ValueError('dashboards fehlt')
        valid_formatters = ('number','text','course','directionRad','angleRad','speedMpsKn','depthAdaptive','kelvin','pascalHpa','percent','latitude','longitude')
        for name, dashboard in dashboards.items():
            if not isinstance(dashboard, dict):
                raise ValueError('Ungueltiges Dashboard: %s' % name)
            interval = dashboard.get('updateInterval', 1000)
            try: interval = int(interval)
            except Exception: interval = 1000
            dashboard['updateInterval'] = max(250, min(interval, 60000))
            dashboard['title'] = str(dashboard.get('title', name))[:80]
            items = dashboard.get('items', [])
            if not isinstance(items, list):
                raise ValueError('items fehlt bei %s' % name)
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    raise ValueError('Ungueltiges Anzeigeelement')
                item['id'] = str(item.get('id', '%s-%d' % (name,index)))[:80]
                item['path'] = str(item.get('path',''))[:400]
                item['role'] = str(item.get('role','generic'))[:40]
                item['label'] = str(item.get('label', item['path']))[:80]
                item['unit'] = str(item.get('unit',''))[:20]
                item['size'] = str(item.get('size','medium'))
                if item['size'] not in ('small','medium','large','hero'): item['size']='medium'
                try: item['decimals'] = max(0,min(int(item.get('decimals',1)),6))
                except Exception: item['decimals']=1
                try: item['maxChars'] = max(1,min(int(item.get('maxChars',6)),20))
                except Exception: item['maxChars']=6
                formatter = str(item.get('formatter','number'))
                item['formatter'] = formatter if formatter in valid_formatters else 'number'
        value['schemaVersion'] = 3
        return value

    def load_config(self):
        return self.validate_config(self._read_json(self.config_file, self.default_config()))

    def save_config(self, value):
        value = self.validate_config(value)
        self._atomic_write(self.config_file, value)
        return value

    def load_catalog(self):
        value = self._read_json(self.catalog_file, {})
        return value if isinstance(value, dict) else {}

    def save_catalog(self, value):
        if not isinstance(value, dict):
            raise ValueError('Katalog muss ein Objekt sein')
        self._atomic_write(self.catalog_file, value)
        return value

    def arg_value(self, args, name):
        value = args.get(name)
        return value[0] if isinstance(value,list) and value else value

    def handleApiRequest(self, url, handler, args):
        name = str(url).strip('/')
        if name == 'capabilities':
            return {'status':'OK','storage':'server','features':{'serverConfig':True,'valueHistory':True,'profiles':False},'version':self.VERSION}
        if name == 'time':
            now = datetime.datetime.now().astimezone()
            offset = now.utcoffset()
            offset_minutes = (
                int(offset.total_seconds() // 60)
                if offset is not None
                else 0
            )
            return {
                'status': 'OK',
                'localTime': now.isoformat(),
                'offsetMinutes': offset_minutes,
                'timezone': str(now.tzinfo or ''),
                'source': 'avnav-server'
            }
        if name == 'config': return {'status':'OK','config':self.load_config()}
        if name == 'defaults': return {'status':'OK','config':self.default_config()}
        if name == 'catalog': return {'status':'OK','catalog':self.load_catalog()}
        if name in ('saveConfig','saveCatalog'):
            key = 'config' if name == 'saveConfig' else 'catalog'
            raw = self.arg_value(args,key)
            if raw is None: return {'status':'ERROR','error':'Parameter %s fehlt' % key}
            try:
                parsed=json.loads(raw)
                saved=self.save_config(parsed) if name == 'saveConfig' else self.save_catalog(parsed)
                return {'status':'OK',key:saved}
            except Exception as error:
                return {'status':'ERROR','error':str(error)}
        return {'status':'ERROR','error':'Unbekannter Request: %s' % url}

    def run(self):
        base_url = self.api.getBaseUrl().rstrip('/')
        app_url = base_url + '/display/navigation.html'
        try:
            self.user_app_id = self.api.registerUserApp(app_url,'icon.svg',title=None,preventConnectionLost=True,name='legacy-display',shortText='Display',longText='Legacy Display')
            self.api.setStatus('RUNNING','Startseite: %s' % app_url)
            self.api.log('Legacy display plugin %s started, URL=%s' % (self.VERSION,app_url))
        except Exception as error:
            self.api.setStatus('ERROR','UserApp registration failed: %s' % error)
            return
        while not self.api.shouldStopMainThread(): time.sleep(1)

    def stop(self):
        if self.user_app_id is not None and hasattr(self.api,'unregisterUserApp'):
            try: self.api.unregisterUserApp(self.user_app_id)
            except Exception: pass
            self.user_app_id=None
