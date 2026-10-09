import { HTTP_STATUS } from '@/utils/api/apiConfig';
import type { ValidationErrorResponse } from '@/types/api';

const ERROR_MESSAGES: Record<number, string> = {
  [HTTP_STATUS.BAD_REQUEST]: 'Invalid request data.',
  [HTTP_STATUS.UNAUTHORIZED]: 'Authentication required.',
  [HTTP_STATUS.FORBIDDEN]: 'Access denied.',
  [HTTP_STATUS.NOT_FOUND]: 'Resource not found.',
  [HTTP_STATUS.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later.',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Server error. Please try again later.',
};

interface AxiosLikeErrorData {
  message?: string | { message?: string; errors?: Record<string, string> } | null;
  error?: string;
  errors?: Record<string, string>;
}

interface AxiosLikeError {
  response?: { status: number; data?: AxiosLikeErrorData };
  request?: unknown;
  code?: string;
}

export const handleApiError = (error: unknown): string => {
  const err = error as AxiosLikeError;
  if (err.response) {
    const { status, data } = err.response;
    return (data?.message as string | undefined) || ERROR_MESSAGES[status] || 'Request failed. Please try again.';
  }
  else if (err.request) {
    if (err.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    } else {
      return 'Network error. Please check your connection and try again.';
    }
  }
  else {
    return 'An unexpected error occurred. Please try again.';
  }
};

export const getValidationErrorResponse = (error: unknown): ValidationErrorResponse => {
  const err = error as AxiosLikeError;
  if (!err.response?.data) {
    return { message: handleApiError(error) };
  }

  const data = err.response.data;

  const topLevelErrors = data.errors;
  const nested = typeof data.message === 'object' && data.message !== null ? data.message : null;
  const nestedErrors = nested && nested.errors;

  const errors = topLevelErrors || nestedErrors || undefined;

  let message: string;
  if (typeof data.message === 'string') {
    message = data.message;
  } else if (nested && typeof nested.message === 'string') {
    message = nested.message;
  } else if (typeof data.error === 'string') {
    message = data.error;
  } else {
    message = handleApiError(error);
  }

  return { message, errors };
};
