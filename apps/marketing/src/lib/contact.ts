const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export type ContactFormData = {
  name: string;
  email: string;
  company?: string;
  message: string;
  turnstileToken: string;
};

export type ContactResponse = {
  success: boolean;
  message?: string;
};

export async function submitContact(
  data: ContactFormData,
): Promise<ContactResponse> {
  const res = await fetch(`${API_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait.');
    }
    throw new Error(result.message || 'Submission failed');
  }

  return result;
}
