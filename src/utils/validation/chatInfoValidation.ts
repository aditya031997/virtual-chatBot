import type { ChatFormData, ChatInfoErrors, ChatInfoValidationResult } from "@/types/forms";

export const validateFullName = (value: string): string => {
  if (!value || value.trim() === '') {
    return 'Full name is required';
  }
  if (value.trim().length < 2) {
    return 'Full name must be at least 2 characters';
  }
  if (value.trim().length > 100) {
    return 'Full name must be 100 characters or less';
  }
  return '';
};

export const validateEmail = (email: string): string => {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }
  if (email.trim().length > 255) {
    return 'Email must be 255 characters or less';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return '';
};

export const validatePhone = (value: string): string => {
  if (!value || value.trim() === '') {
    return 'Phone number is required';
  }
  const cleanPhone = value.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  if (cleanPhone.length > 13) {
    return 'Phone number cannot exceed 13 digits';
  }
  return '';
};

/**
 * Validates the full chat info form.
 */
export const validateChatInfoForm = (formData: ChatFormData): ChatInfoValidationResult => {
  const errors: ChatInfoErrors = {};
  errors.fullName = validateFullName(formData.fullName);
  errors.email = validateEmail(formData.email);
  errors.phone = validatePhone(formData.phone);

  (Object.keys(errors) as (keyof ChatInfoErrors)[]).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
