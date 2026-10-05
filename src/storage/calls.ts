import {
  Call,
} from '../models/call';
import {
  getLocal,
  setLocal,
} from './localStore';

const CALLS_KEY = 'call_history';

export async function getCalls(): Promise<Call[]> {
  return getLocal<Call[]>(
    CALLS_KEY,
    [],
  );
}

export async function saveCalls(
  calls: Call[],
) {
  await setLocal(
    CALLS_KEY,
    calls,
  );
}

export async function getCall(
  callId: string,
): Promise<Call | null> {
  const calls = await getCalls();

  return (
    calls.find(
      (call) => call.id === callId,
    ) ?? null
  );
}

export async function getConversationCalls(
  conversationId: string,
): Promise<Call[]> {
  const calls = await getCalls();

  return calls
    .filter(
      (call) =>
        call.conversationId ===
        conversationId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
}

export async function addCall(
  call: Call,
) {
  const calls = await getCalls();

  await saveCalls([
    call,
    ...calls,
  ]);
}

export async function updateCall(
  updated: Call,
) {
  const calls = await getCalls();

  await saveCalls(
    calls.map((call) =>
      call.id === updated.id
        ? updated
        : call,
    ),
  );
}

export async function deleteCall(
  callId: string,
) {
  const calls = await getCalls();

  await saveCalls(
    calls.filter(
      (call) => call.id !== callId,
    ),
  );
}

export async function clearCallHistory() {
  await saveCalls([]);
}
