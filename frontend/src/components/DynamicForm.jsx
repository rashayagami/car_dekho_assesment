import React, { memo, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import FormField from './FormField';
import './DynamicForm.css';

/**
 * Renders a full form from the AI's form_config.
 * Uses react-hook-form's FormProvider for deep field access.
 */
const DynamicForm = memo(function DynamicForm({ formConfig, onSubmit, disabled: parentDisabled, hideHeader, messageContent }) {
  const [submitted, setSubmitted] = useState(false);
  const methods = useForm();
  const disabled = parentDisabled || submitted;

  const handleSubmit = methods.handleSubmit((data) => {
    setSubmitted(true);
    onSubmit(data);
  });

  if (!formConfig || !formConfig.fields) return null;

  return (
    <div className={`df-container ${submitted ? 'df-submitted' : ''}`}>
      {!hideHeader && formConfig.label && <h4 className="df-label">{formConfig.label}</h4>}
      {!hideHeader && formConfig.description && <p className="df-description">{formConfig.description}</p>}

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit} className="df-form">
          {formConfig.fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              disabled={disabled}
              showLabel={formConfig.fields.length > 1}
              parentTexts={[formConfig.label, formConfig.description, messageContent]}
            />
          ))}

          {!submitted && (
            <button type="submit" className="df-submit" disabled={disabled}>
              {formConfig.submit_button_text || formConfig.submitButtonText || 'Continue'}
            </button>
          )}

          {submitted && (
            <p className="df-submitted-text">✓ Submitted</p>
          )}
        </form>
      </FormProvider>
    </div>
  );
});

export default DynamicForm;
