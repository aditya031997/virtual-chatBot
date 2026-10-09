"use client";

import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import flags from "react-phone-number-input/flags";
import {
  validateChatInfoForm,
  validateFullName,
  validateEmail,
  validatePhone,
} from "@/utils/validation/chatInfoValidation";
import SendIcon from "@/public/icon/sendIcon";
import type { ChatFormData, ChatInfoErrors } from "@/types/forms";

const PHONE_COUNTRY = "AU";
const PHONE_DIAL_CODE = "+61";
const PHONE_MAX_NATIONAL_DIGITS = 11;
const FlagIcon = flags[PHONE_COUNTRY];

interface ChatInfoFormProps {
  onSubmit: (data: ChatFormData) => void;
  compact?: boolean;
  submitting?: boolean;
}

function SpinnerIcon() {
  return (
    <svg className="nca-chatbot__submit-spin nca-chatbot__spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="nca-chatbot__opacity-25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ChatInfoForm({ onSubmit, compact = false, submitting = false }: ChatInfoFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [errors, setErrors] = useState<ChatInfoErrors>({});

  const phone = phoneDigits ? `${PHONE_DIAL_CODE}${phoneDigits}` : "";
  const formData = { fullName, email, phone };
  const validation = validateChatInfoForm(formData);
  const isFormValid = validation.isValid;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    onSubmit({ fullName, email, phone });
  };

  const handleFullNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " && (!fullName || fullName.trim() === "")) {
      e.preventDefault();
    }
  };

  const handleFullNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFullName(value);
    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: validateFullName(value) }));
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_MAX_NATIONAL_DIGITS);
    setPhoneDigits(digits);
    if (errors.phone) {
      const nextPhone = digits ? `${PHONE_DIAL_CODE}${digits}` : "";
      setErrors((prev) => ({ ...prev, phone: validatePhone(nextPhone) }));
    }
  };

  const handleBlur = (field: keyof ChatInfoErrors) => {
    const error =
      field === "fullName"
        ? validateFullName(fullName)
        : field === "email"
          ? validateEmail(email)
          : validatePhone(phone);
    setErrors((prev) => ({ ...prev, [field]: error || undefined }));
  };

  const inputSize = compact ? "nca-chatbot__field-input--compact" : "nca-chatbot__field-input--regular";
  const labelMb = compact ? "nca-chatbot__field-label--mb-tight" : "nca-chatbot__field-label--mb";
  const formSpace = compact ? "nca-chatbot__info-form--space nca-chatbot__info-form--space-compact" : "nca-chatbot__info-form--space";
  const submitPad = compact ? "nca-chatbot__form-submit-row--compact" : "nca-chatbot__form-submit-row--regular";
  const submitBtn = compact ? "nca-chatbot__form-submit-btn--compact" : "nca-chatbot__form-submit-btn--regular";

  const phoneMods = ["nca-chatbot__phone", compact ? "nca-chatbot__phone--compact" : "", errors.phone ? "nca-chatbot__phone--error" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <form onSubmit={handleSubmit} className={`nca-chatbot__info-form ${formSpace}`}>
      <div>
        <label htmlFor="fullName" className={`nca-chatbot__field-label ${labelMb}`}>
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          placeholder="Enter full name"
          value={fullName}
          onChange={handleFullNameChange}
          onKeyDown={handleFullNameKeyDown}
          onBlur={() => handleBlur("fullName")}
          className={`nca-chatbot__field-input ${inputSize} ${errors.fullName ? "nca-chatbot__field-input--error" : "nca-chatbot__field-input--focus-ok"}`}
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
        />
        {errors.fullName ? (
          <p id="fullName-error" className="nca-chatbot__field-error" role="alert">
            {errors.fullName}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="email" className={`nca-chatbot__field-label ${labelMb}`}>
          Email Address
        </label>
        <input
          id="email"
          type="email"
          placeholder="Enter email Id"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleBlur("email")}
          className={`nca-chatbot__field-input ${inputSize} ${errors.email ? "nca-chatbot__field-input--error" : "nca-chatbot__field-input--focus-ok"}`}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email ? (
          <p id="email-error" className="nca-chatbot__field-error" role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="phone" className={`nca-chatbot__field-label ${labelMb}`}>
          Phone
        </label>
        <div className={`PhoneInput ${phoneMods}`}>
          {FlagIcon ? (
            <span className="nca-chatbot__phone-flag" aria-hidden>
              <FlagIcon title={PHONE_COUNTRY} />
            </span>
          ) : null}
          <span className="nca-chatbot__phone-country-code" aria-hidden>
            {PHONE_DIAL_CODE}
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="Phone number"
            value={phoneDigits}
            onChange={handlePhoneChange}
            onBlur={() => handleBlur("phone")}
            maxLength={PHONE_MAX_NATIONAL_DIGITS}
            className="PhoneInputInput"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
        </div>
        {errors.phone ? (
          <p id="phone-error" className="nca-chatbot__field-error" role="alert">
            {errors.phone}
          </p>
        ) : null}
      </div>
      <div className={`nca-chatbot__form-submit-row ${submitPad}`}>
        <button
          type="submit"
          disabled={!isFormValid || submitting}
          aria-busy={submitting}
          className={`nca-chatbot__form-submit-btn ${submitBtn}`}
        >
          {submitting ? "Submitting" : "Submit"}
          {submitting ? <SpinnerIcon /> : <SendIcon className="nca-chatbot__submit-icon" />}
        </button>
      </div>
    </form>
  );
}
