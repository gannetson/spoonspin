/**
 * Arctic (and other Web Crypto callers) use the bare `crypto` global.
 * Node 18 has globalThis.crypto / webcrypto but not always the bare binding
 * unless --experimental-global-webcrypto is set. Ensure it before OAuth loads.
 */
import { webcrypto } from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
    writable: true,
  });
} else if (typeof globalThis.crypto.getRandomValues !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
    writable: true,
  });
}
