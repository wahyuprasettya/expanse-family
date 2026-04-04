import { Alert as RNAlert } from 'react-native';

let enqueueAlert = null;
const pendingAlerts = [];

const normalizeButtons = (buttons) =>
  Array.isArray(buttons) && buttons.length > 0
    ? buttons
    : [{ text: 'OK' }];

export const showAppAlert = (title, message, buttons, options = {}) => {
  const payload = {
    title: title || '',
    message: message || '',
    buttons: normalizeButtons(buttons),
    options: options || {},
  };

  if (enqueueAlert) {
    enqueueAlert(payload);
  } else {
    pendingAlerts.push(payload);
  }
};

export const registerAppAlertHandler = (handler) => {
  enqueueAlert = handler;
  pendingAlerts.splice(0).forEach((payload) => {
    handler(payload);
  });

  return () => {
    if (enqueueAlert === handler) {
      enqueueAlert = null;
    }
  };
};

export const installGlobalAlert = () => {
  RNAlert.alert = showAppAlert;
};

export default showAppAlert;
