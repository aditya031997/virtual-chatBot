/**
 * Form data and validation result shapes shared across components.
 */

import type { ChatFormData } from "@/types/chat";

export type { ChatFormData };

export interface ChatInfoErrors {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface ChatInfoValidationResult {
  isValid: boolean;
  errors: ChatInfoErrors;
}
