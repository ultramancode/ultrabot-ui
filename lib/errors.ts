export type ErrorCode =
  | 'bad_request:auth'
  | 'bad_request:chat'
  | 'bad_request:api'
  | 'unauthorized:auth'
  | 'forbidden:auth'
  | 'rate_limit:chat'
  | 'not_found:chat'
  | 'forbidden:chat'
  | 'unauthorized:chat'
  | 'offline:chat';



export class ChatSDKError extends Error {
  public statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();
    this.cause = cause;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByErrorCode(errorCode);
  }

  public toResponse() {
    const { message, cause, statusCode } = this;
    return Response.json({ message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  switch (errorCode) {
    case 'bad_request:api':
      return "The request couldn't be processed. Please check your input and try again.";
    case 'bad_request:auth':
      return 'Authentication request failed. Please check your credentials.';
    case 'bad_request:chat':
      return 'Chat request failed. Please check your input and try again.';

    case 'unauthorized:auth':
      return 'You need to sign in before continuing.';
    case 'forbidden:auth':
      return 'Your account does not have access to this feature.';

    case 'rate_limit:chat':
      return 'You have exceeded your maximum number of messages for the day. Please try again later.';
    case 'not_found:chat':
      return 'The requested chat was not found. Please check the chat ID and try again.';
    case 'forbidden:chat':
      return 'This chat belongs to another user. Please check the chat ID and try again.';
    case 'unauthorized:chat':
      return 'You need to sign in to view this chat. Please sign in and try again.';
    case 'offline:chat':
      return "We're having trouble sending your message. Please check your internet connection and try again.";

    default:
      return 'Something went wrong. Please try again later.';
  }
}

function getStatusCodeByErrorCode(errorCode: ErrorCode): number {
  if (errorCode.startsWith('bad_request:')) return 400;
  if (errorCode.startsWith('unauthorized:')) return 401;
  if (errorCode.startsWith('forbidden:')) return 403;
  if (errorCode.startsWith('not_found:')) return 404;
  if (errorCode.startsWith('rate_limit:')) return 429;
  if (errorCode.startsWith('offline:')) return 503;
  return 500;
}
