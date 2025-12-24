export function getDeviceLabel(deviceId: string, currentDeviceId: string, index: number): string {
  if (deviceId === currentDeviceId) {
    return 'This Device';
  }
  return `Device ${index + 1}`;
}

export function getStateLabel(state: string): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export function getStateClass(state: string): string {
  return `state-${state}`;
}
