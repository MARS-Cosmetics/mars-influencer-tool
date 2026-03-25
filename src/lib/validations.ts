// Indian phone number: +91 or 0 prefix, 10 digits
export function validatePhone(phone: string): boolean {
  if (!phone) return true; // optional field
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^(\+91|91|0)?[6-9]\d{9}$/.test(cleaned);
}

// Indian PAN: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
export function validatePAN(pan: string): boolean {
  if (!pan) return true;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
}

// Indian GST: 2-digit state code + PAN + 1 digit + Z + 1 alphanumeric
export function validateGST(gst: string): boolean {
  if (!gst) return true;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(
    gst.toUpperCase()
  );
}

// Indian pincode: 6 digits, starts with 1-9
export function validatePincode(pincode: string): boolean {
  if (!pincode) return true;
  return /^[1-9][0-9]{5}$/.test(pincode);
}

// Email
export function validateEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// IFSC code: 4 letters + 0 + 6 alphanumeric
export function validateIFSC(ifsc: string): boolean {
  if (!ifsc) return true;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
}

// Instagram handle: alphanumeric, dots, underscores, 1-30 chars
export function validateInstagramHandle(handle: string): boolean {
  if (!handle) return true;
  const cleaned = handle.startsWith("@") ? handle.slice(1) : handle;
  return /^[a-zA-Z0-9._]{1,30}$/.test(cleaned);
}

// Aadhar number: 12 digits (with optional spaces)
export function validateAadhar(aadhar: string): boolean {
  if (!aadhar) return true;
  const cleaned = aadhar.replace(/\s/g, "");
  return /^\d{12}$/.test(cleaned);
}

// Bank account number: 9-18 digits
export function validateBankAccount(account: string): boolean {
  if (!account) return true;
  return /^\d{9,18}$/.test(account);
}

// UPI ID: username@bankcode
export function validateUPI(upi: string): boolean {
  if (!upi) return true;
  return /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/.test(upi);
}

// Format phone for display
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+91")) {
    const num = cleaned.slice(3);
    return `+91 ${num.slice(0, 5)} ${num.slice(5)}`;
  }
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

// Get Instagram profile URL
export function getInstagramUrl(handle: string): string {
  const cleaned = handle.startsWith("@") ? handle.slice(1) : handle;
  return `https://instagram.com/${cleaned}`;
}

// Get YouTube channel URL
export function getYouTubeUrl(handle: string): string {
  if (handle.startsWith("UC") || handle.startsWith("@")) {
    return `https://youtube.com/${handle}`;
  }
  return `https://youtube.com/@${handle}`;
}
