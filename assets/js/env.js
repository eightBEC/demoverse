(function() {

  function Env(ws) {
    this._error = null;
    ws.onerror = (e) => {
      this._error = e;
    };
    ws.onclose = () => {
      this._error = this._error || 'connection closed';
    };
    this._ws = ws;
  }

  Env.prototype.reset = function() {
    return this._call({type: 'reset'});
  };

  Env.prototype.step = function(events) {
    var actions = actionsForEvents(events);
    return this._call({type: 'step', actions: actions});
  };

  Env.prototype._call = function(msg) {
    return new Promise((resolve, reject) => {
      if (this._error) {
        reject(this._error);
        return;
      }
      var onError, onMessage;
      var removeEvents = () => {
        this._ws.removeEventListener('error', onError);
        this._ws.removeEventListener('message', onMessage);
      };
      onError = (e) => {
        removeEvents();
        reject(e);
      };
      onMessage = (m) => {
        removeEvents();
        var parsed;
        try {
          parsed = JSON.parse(m.data);
        } catch (e) {
          reject(e);
          return;
        }
        if (parsed.type === 'error') {
          reject(parsed.error);
        } else {
          resolve(parsed);
        }
      };
      this._ws.addEventListener('error', onError);
      this._ws.addEventListener('message', onMessage);
      try {
        this._ws.send(JSON.stringify(msg));
      } catch (e) {
        removeEvents();
        reject(e);
        return;
      }
    });
  };

  window.connectEnv = function(name) {
    return new Promise((resolve, reject) => {
      var wsProto = 'ws://';
      if (location.protocol === 'https:') {
        wsProto = 'wss://';
      }
      var sock = new WebSocket(wsProto + location.host + '/env/' + name);
      sock.onopen = function() {
        sock.onerror = () => false;
        resolve(new Env(sock));
      };
      sock.onerror = function(e) {
        reject(e);
      };
    });
  };

  function actionsForEvents(events) {
    var actions = [];
    events.forEach((e) => {
      var mouseTypes = {
        'mousedown': 'mousePressed',
        'mouseup': 'mouseReleased',
        'mousemove': 'mouseMoved'
      };
      var keyTypes = {
        'keydown': 'keyDown',
        'keyup': 'keyUp'
      };
      if (mouseTypes[e.type] && e.button === 0) {
        actions.push({
          mouseEvent: {
            type: mouseTypes[e.type],
            x: e.offsetX,
            y: e.offsetY,
            button: 'left',
            clickCount: e.detail
          }
        });
      } else if (keyTypes[e.type] && !e.shiftKey && !e.metaKey &&
                 !e.ctrlKey && !e.altKey) {
        var text = (e.key.length === 1 ? e.key : '');
        actions.push({
          type: keyTypes[e.type],
          text: text,
          unmodifiedText: text,
          keyIdentifier: e.keyIdentifier,
          code: e.code,
          key: e.key,
          windowsVirtualKeyCode: e.keyCode,
          nativeVirtualKeyCode: e.keyCode
        });
      }
    });
    return actions;
  }

})();
