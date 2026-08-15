import { useSyncExternalStore } from "react";
import {
  getPublicConfig,
  loadPublicConfig,
  subscribePublicConfig,
  type PublicConfig,
} from "./publicConfig";

const EMPTY: PublicConfig = {
  awinPublisherId: null,
  awinThuisbezorgdMid: null,
};

/** Subscribe to runtime public config (Awin ids from `/api/public-config`). */
export function usePublicConfig(): PublicConfig {
  return useSyncExternalStore(subscribePublicConfig, getPublicConfig, () => EMPTY);
}

/** Kick off the fetch once (safe to call from module scope / main). */
export function ensurePublicConfigLoaded(): void {
  void loadPublicConfig();
}
