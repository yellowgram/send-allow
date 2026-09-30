/**
 * Client SDK — point wallets / agents at the Send Allow proxy.
 */
export {
  createSendAllowConnection,
  createSendAllowFetch,
  viemHttpArgs,
  type SendAllowProviderOptions,
  type SendAllowConnection,
} from "./provider.js";

export {
  ERR_POLICY_DENIED,
  ERR_UNSIGNED_SEND_REFUSED,
  sendAllowErrorCode,
  sendAllowErrorData,
  isPolicyDeniedError,
  isUnsignedSendRefusedError,
  isSendAllowAbortError,
  classifySendAllowError,
  type SendAllowRpcErrorLike,
  type SendAllowErrorKind,
} from "./errors.js";
