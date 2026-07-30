import time


class Plugin(object):
    """AVNav user plugin providing standalone legacy E-Ink display pages."""

    @classmethod
    def pluginInfo(cls):
        return {
            'description': 'Standalone legacy E-Ink/Tolino display pages',
            'version': '0.2.0'
        }

    def __init__(self, api):
        self.api = api
        self.user_app_id = None
        if hasattr(self.api, 'registerRestart'):
            self.api.registerRestart(self.stop)

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
            self.api.log('Legacy display plugin started, URL=%s' % app_url)
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
