import React, { useState } from 'react';
import { FormRenderer, type FormFieldItem } from './FormRenderer';

interface RegistrationFormWrapperProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  pricePerCouple: number;
  fields: FormFieldItem[];
  turnstileSiteKey?: string;
}

export function RegistrationFormWrapper({
  eventId,
  eventSlug,
  eventTitle,
  pricePerCouple,
  fields,
  turnstileSiteKey,
}: RegistrationFormWrapperProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: Record<string, any>) => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Get turnstile token if present
      let turnstileToken = '';
      if (turnstileSiteKey) {
        const turnstileInput = document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement;
        turnstileToken = turnstileInput?.value || '';
      }

      const { husband_name, wife_name, whatsapp, email, ...customAnswers } = values;

      const payload = {
        event_id: eventId,
        husband_name,
        wife_name,
        whatsapp,
        email,
        answers: customAnswers,
        turnstile_token: turnstileToken,
      };

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
      }

      // Store registration data in sessionStorage
      const regData = json.data;
      sessionStorage.setItem(`hcc_registration_${eventSlug}`, JSON.stringify(regData));

      // Navigate to success page
      window.location.href = `/daftar/${eventSlug}/sukses`;
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim formulir pendaftaran.');
      setSubmitting(false);
    }
  };

  return (
    <div className="registration-wrapper">
      <FormRenderer
        eventTitle={eventTitle}
        fields={fields}
        onSubmit={handleSubmit}
        submitting={submitting}
        errorMessage={errorMessage}
      />

      {turnstileSiteKey && (
        <div className="turnstile-wrap">
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light"></div>
        </div>
      )}

      <style>{`
        .registration-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .turnstile-wrap {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
