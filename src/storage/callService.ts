import {
  Call,
  CallParticipant,
  CallType,
} from '../models/call';
import {
  addCall,
} from './calls';

function createCallId() {
  return `call-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export async function createOutgoingCall(params: {
  conversationId: string;
  type: CallType;
  caller: CallParticipant;
  recipient: CallParticipant;
}): Promise<Call> {
  const call: Call = {
    id: createCallId(),
    conversationId: params.conversationId,
    type: params.type,
    direction: 'outgoing',
    status: 'ringing',
    caller: params.caller,
    recipient: params.recipient,
    createdAt: new Date().toISOString(),
  };

  await addCall(call);

  return call;
}
