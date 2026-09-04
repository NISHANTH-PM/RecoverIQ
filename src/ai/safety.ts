export interface SensitiveDataResult {
  detected: boolean;
  type:
    | "card_number"
    | "cvv"
    | "otp"
    | "upi_pin"
    | "banking_credential"
    | null;
}

function passesLuhnCheck(value: string): boolean {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function detectSensitivePaymentData(
  message: string,
): SensitiveDataResult {
  const normalized = message.toLowerCase();

  // Card numbers with spaces or hyphens.
  const cardNumberCandidates =
    message.match(
      /\b(?:\d[ -]?){13,19}\b/g,
    ) ?? [];

  for (const candidate of cardNumberCandidates) {
    if (passesLuhnCheck(candidate)) {
      return {
        detected: true,
        type: "card_number",
      };
    }
  }

  // CVV / CVC.
  if (
    /\b(?:cvv|cvc|security code)\b/.test(
      normalized,
    ) &&
    /\b\d{3,4}\b/.test(message)
  ) {
    return {
      detected: true,
      type: "cvv",
    };
  }

  // OTP.
  if (
    /\b(?:otp|one[- ]time password|verification code)\b/.test(
      normalized,
    ) &&
    /\b\d{4,8}\b/.test(message)
  ) {
    return {
      detected: true,
      type: "otp",
    };
  }

  // UPI PIN.
  if (
    /\b(?:upi pin|upi password)\b/.test(
      normalized,
    ) &&
    /\b\d{4,6}\b/.test(message)
  ) {
    return {
      detected: true,
      type: "upi_pin",
    };
  }

  // Explicit banking credentials.
  if (
    /\b(?:bank password|banking password|net banking password|login password|account password)\b/.test(
      normalized,
    )
  ) {
    return {
      detected: true,
      type: "banking_credential",
    };
  }

  return {
    detected: false,
    type: null,
  };
}