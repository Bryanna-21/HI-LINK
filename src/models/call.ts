export type CallType =
  | 'voice'
  | 'video';

export type CallDirection =
  | 'incoming'
  | 'outgoing';

export type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'declined'
  | 'missed'
  | 'ended'
  | 'failed';

export interface CallParticipant {
  id: string;
  name: string;
  username: string;
  avatarUri?: string;
}

export interface Call {
  id: string;
  conversationId: string;
  type: CallType;
  direction: CallDirection;
  status: CallStatus;

  caller: CallParticipant;
  recipient: CallParticipant;

  createdAt: string;
  answeredAt?: string;
  endedAt?: string;

  durationSeconds?: number;

  failureReason?: string;
}
