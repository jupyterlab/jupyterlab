import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ISessionContext } from './sessioncontext';

const KERNEL_STATUSES: Record<ISessionContext.KernelDisplayStatus, string> = {
  unknown: 'Unknown',
  starting: 'Starting',
  idle: 'Idle',
  busy: 'Busy',
  terminating: 'Terminating',
  restarting: 'Restarting',
  autorestarting: 'Autorestarting',
  dead: 'Dead',
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
  initializing: 'Initializing',
  '': ''
};

/**
 * Helper function to translate kernel statuses mapping by using
 * input translator.
 *
 * @param translator - - Language translator.
 * @return The translated kernel status mapping.
 */
export function translateKernelStatuses(
  translator?: ITranslator
): Record<ISessionContext.KernelDisplayStatus, string> {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const translated: Record<
    ISessionContext.KernelDisplayStatus,
    string
  > = KERNEL_STATUSES;
  for (const key in KERNEL_STATUSES) {
    const recordKey = key as ISessionContext.KernelDisplayStatus;
    translated[recordKey] = trans.__(KERNEL_STATUSES[recordKey]);
  }
  return translated;
}
