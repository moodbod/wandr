import type mapboxgl from 'mapbox-gl';
import { Protocol } from 'pmtiles';

let protocol: Protocol | null = null;
let hasRegisteredProtocol = false;

export function registerPmtilesProtocol(mapbox: typeof mapboxgl) {
  if (hasRegisteredProtocol) {
    return;
  }

  protocol ??= new Protocol();
  const addProtocol = (mapbox as typeof mapbox & { addProtocol?: (name: string, handler: unknown) => void }).addProtocol;
  if (!addProtocol) {
    return;
  }

  try {
    addProtocol.call(mapbox, 'pmtiles', protocol.tile);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.toLowerCase().includes('already')) {
      throw error;
    }
  }

  hasRegisteredProtocol = true;
}
