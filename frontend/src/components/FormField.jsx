import React, { memo, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import './FormField.css';

/**
 * Renders a single form field based on its type from config_json.
 * Supports: text, number, textarea, select, radio, checkbox_group,
 * chip_select, card_grid, toggle, range_slider, card_carousel, search_select, rating_select
 */
const FormField = memo(function FormField({ field, disabled, showLabel = true, parentTexts = [] }) {
  const { control, watch, setValue, clearErrors, formState: { errors } } = useFormContext();
  const [searchQuery, setSearchQuery] = useState('');

  // Handle conditional visibility
  if (field.conditional) {
    const watchedValue = watch(field.conditional.field);
    const { operator = 'eq', value } = field.conditional;

    let visible = false;
    if (operator === 'eq') visible = watchedValue === value;
    else if (operator === 'gt') visible = Number(watchedValue) > Number(value);
    else if (operator === 'gte') visible = Number(watchedValue) >= Number(value);
    else if (operator === 'neq') visible = watchedValue !== value;
    else visible = watchedValue == value; // fallback loose equality

    if (!visible) return null;
  }

  const error = errors[field.name];

  const renderField = (fieldProps) => {
    const { field: controllerField } = fieldProps;

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <input
            {...controllerField}
            type={field.type}
            placeholder={field.placeholder || ''}
            disabled={disabled}
            onChange={(e) => {
              const val = field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
              controllerField.onChange(val);
            }}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...controllerField}
            placeholder={field.placeholder || ''}
            disabled={disabled}
            rows={3}
          />
        );

      case 'select':
        return (
          <select {...controllerField} disabled={disabled}>
            <option value="">Select...</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="ff-radio-group">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className={`ff-radio-item ${controllerField.value === opt.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value={opt.value}
                  checked={controllerField.value === opt.value}
                  onChange={() => controllerField.onChange(opt.value)}
                  disabled={disabled}
                />
                <span className="ff-radio-label">{opt.label}</span>
                {opt.description && <span className="ff-radio-desc">{opt.description}</span>}
              </label>
            ))}
          </div>
        );

      case 'checkbox_group':
        return (
          <div className="ff-checkbox-group">
            {(field.options || []).map((opt) => {
              const values = controllerField.value || [];
              const checked = values.includes(opt.value);
              return (
                <label key={opt.value} className={`ff-checkbox-item ${checked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? values.filter((v) => v !== opt.value)
                        : [...values, opt.value];
                      controllerField.onChange(next);
                    }}
                    disabled={disabled}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'chip_select':
        return (
          <div className="ff-chip-group">
            {(field.options || []).map((opt) => {
              const isMulti = field.multiple;
              const values = isMulti ? (controllerField.value || []) : [controllerField.value];
              const selected = values.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`ff-chip ${selected ? 'selected' : ''}`}
                  disabled={disabled}
                  onClick={() => {
                    let nextVal;
                    if (isMulti) {
                      nextVal = selected
                        ? values.filter((v) => v !== opt.value)
                        : [...values, opt.value];
                    } else {
                      nextVal = selected ? '' : opt.value;
                    }
                    controllerField.onChange(nextVal);

                    // Custom logic for budget preset auto-fill
                    if (field.name === 'budget_preset' && nextVal) {
                      const range = nextVal;
                      const minName = watch('budget_min') !== undefined ? 'budget_min' : 'min_budget';
                      const maxName = watch('budget_max') !== undefined ? 'budget_max' : 'max_budget';
                      const isLakhsScale = minName === 'min_budget';

                      let min = '';
                      let max = '';
                      if (range.toLowerCase() === '3-5l') { min = isLakhsScale ? 3 : 300000; max = isLakhsScale ? 5 : 500000; }
                      else if (range.toLowerCase() === '5-8l') { min = isLakhsScale ? 5 : 500000; max = isLakhsScale ? 8 : 800000; }
                      else if (range.toLowerCase() === '8-12l') { min = isLakhsScale ? 8 : 800000; max = isLakhsScale ? 12 : 1200000; }
                      else if (range.toLowerCase() === '12-20l') { min = isLakhsScale ? 12 : 1200000; max = isLakhsScale ? 20 : 2000000; }
                      else if (range.toLowerCase() === '20l+') { min = isLakhsScale ? 20 : 2000000; max = isLakhsScale ? 100 : 10000000; }

                      if (min !== '' && max !== '') {
                        setValue(minName, min);
                        setValue(maxName, max);
                        clearErrors(minName);
                        clearErrors(maxName);
                      }
                    }
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );

      case 'card_grid':
        return (
          <div className="ff-card-grid">
            {(field.options || []).map((opt) => {
              const isMulti = field.multiple;
              const values = isMulti ? (controllerField.value || []) : [controllerField.value];
              const selected = values.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`ff-card ${selected ? 'selected' : ''}`}
                  disabled={disabled}
                  onClick={() => {
                    if (isMulti) {
                      const next = selected
                        ? values.filter((v) => v !== opt.value)
                        : [...values, opt.value];
                      controllerField.onChange(next);
                    } else {
                      controllerField.onChange(selected ? '' : opt.value);
                    }
                  }}
                >
                  {opt.icon && <span className="ff-card-icon">{opt.icon}</span>}
                  <span className="ff-card-label">{opt.label}</span>
                  {opt.description && <span className="ff-card-desc">{opt.description}</span>}
                </button>
              );
            })}
          </div>
        );

      case 'toggle':
        return (
          <label className="ff-toggle">
            <input
              type="checkbox"
              checked={!!controllerField.value}
              onChange={(e) => controllerField.onChange(e.target.checked)}
              disabled={disabled}
            />
            <span className="ff-toggle-track">
              <span className="ff-toggle-thumb" />
            </span>
          </label>
        );

      case 'range_slider':
        return (
          <div className="ff-slider">
            <input
              type="range"
              min={field.min || 1}
              max={field.max || 5}
              step={field.step || 1}
              value={controllerField.value ?? field.defaultValue ?? field.min ?? 1}
              onChange={(e) => controllerField.onChange(Number(e.target.value))}
              disabled={disabled}
            />
            {field.labels && (
              <div className="ff-slider-labels">
                {field.labels.map((label, i) => (
                  <span key={i} className={controllerField.value === i + 1 ? 'active' : ''}>{label}</span>
                ))}
              </div>
            )}
            <span className="ff-slider-value">{controllerField.value ?? field.defaultValue ?? field.min ?? 1}</span>
          </div>
        );

      case 'card_carousel':
        return (
          <div className="ff-card-carousel">
            {(field.options || []).map((opt) => {
              const isMulti = field.multiple;
              const values = isMulti ? (controllerField.value || []) : [controllerField.value];
              const selected = values.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`ff-carousel-card ${selected ? 'selected' : ''}`}
                  disabled={disabled}
                  onClick={() => {
                    if (isMulti) {
                      const next = selected
                        ? values.filter((v) => v !== opt.value)
                        : [...values, opt.value];
                      controllerField.onChange(next);
                    } else {
                      controllerField.onChange(selected ? '' : opt.value);
                    }
                  }}
                >
                  {selected && <div className="ff-card-badge">✓</div>}
                  {opt.icon && <span className="ff-card-icon">{opt.icon}</span>}
                  <span className="ff-card-label">{opt.label}</span>
                  {opt.description && <span className="ff-card-desc">{opt.description}</span>}
                </button>
              );
            })}
          </div>
        );

      case 'search_select': {
        const isMulti = field.multiple;
        const values = isMulti ? (controllerField.value || []) : (controllerField.value ? [controllerField.value] : []);
        const filteredOptions = (field.options || []).filter(opt =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
          <div className="ff-search-select">
            {values.length > 0 && (
              <div className="ff-search-selected-chips">
                {values.map(val => {
                  const opt = (field.options || []).find(o => o.value === val);
                  return (
                    <span key={val} className="ff-search-chip">
                      {opt ? opt.label : val}
                      {!disabled && (
                        <button
                          type="button"
                          className="ff-search-chip-remove"
                          onClick={() => {
                            const next = values.filter(v => v !== val);
                            controllerField.onChange(isMulti ? next : '');
                          }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
            <input
              type="text"
              placeholder={field.placeholder || "Search options..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
              className="ff-search-input"
            />
            {searchQuery && filteredOptions.length > 0 && (
              <div className="ff-search-results">
                {filteredOptions.map((opt) => {
                  const selected = values.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ff-search-result-item ${selected ? 'selected' : ''}`}
                      disabled={disabled}
                      onClick={() => {
                        if (isMulti) {
                          const next = selected
                            ? values.filter((v) => v !== opt.value)
                            : [...values, opt.value];
                          controllerField.onChange(next);
                        } else {
                          controllerField.onChange(selected ? '' : opt.value);
                          setSearchQuery('');
                        }
                      }}
                    >
                      {opt.label}
                      {selected && <span className="ff-search-result-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {searchQuery && filteredOptions.length === 0 && (
              <div className="ff-search-no-results">No matches found</div>
            )}
          </div>
        );
      }

      case 'rating_select': {
        const rating = Number(controllerField.value) || 0;
        const maxRating = field.max || 5;
        return (
          <div className="ff-rating-select">
            {Array.from({ length: maxRating }, (_, i) => {
              const value = i + 1;
              const active = rating >= value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`ff-rating-star ${active ? 'active' : ''}`}
                  disabled={disabled}
                  onClick={() => controllerField.onChange(value)}
                  title={`${value} out of ${maxRating}`}
                >
                  ★
                </button>
              );
            })}
            {rating > 0 && (
              <span className="ff-rating-value-label">
                {rating} / {maxRating}
              </span>
            )}
          </div>
        );
      }

      default:
        return <input {...controllerField} disabled={disabled} />;
    }
  };

  // Build validation rules from config
  const rules = {};
  if (field.validation) {
    if (field.validation.required) {
      rules.required = typeof field.validation.required === 'string'
        ? field.validation.required
        : 'This field is required';
    }
    if (field.validation.min) {
      rules.min = field.validation.min;
    }
    if (field.validation.max) {
      rules.max = field.validation.max;
    }
    if (field.validation.pattern) {
      rules.pattern = field.validation.pattern;
    }
  }

  // Detect if field label duplicates form label/description/message content
  const isRedundant = parentTexts && parentTexts.some(text => {
    if (!text || !field.label) return false;
    const cleanParentText = text.toLowerCase().replace(/[?.!,]/g, '').trim();
    const cleanFieldLabel = field.label.toLowerCase().replace(/[?.!,]/g, '').trim();
    return cleanParentText === cleanFieldLabel || cleanParentText.includes(cleanFieldLabel) || cleanFieldLabel.includes(cleanParentText);
  });

  const shouldShowLabel = showLabel && !isRedundant;

  return (
    <div className="ff-field">
      {field.label && field.type !== 'toggle' && shouldShowLabel && (
        <label className="ff-label">{field.label}</label>
      )}
      <div className="ff-input-wrap">
        {field.type === 'toggle' ? (
          <div className="ff-toggle-row">
            {shouldShowLabel && <span className="ff-label">{field.label}</span>}
            <Controller
              name={field.name}
              control={control}
              defaultValue={field.defaultValue ?? (field.type === 'toggle' ? false : (field.multiple ? [] : ''))}
              rules={rules}
              render={renderField}
            />
          </div>
        ) : (
          <Controller
            name={field.name}
            control={control}
            defaultValue={field.defaultValue ?? (field.type === 'toggle' ? false : (field.multiple ? [] : ''))}
            rules={rules}
            render={renderField}
          />
        )}
      </div>
      {error && <span className="ff-error">{error.message}</span>}
    </div>
  );
});

export default FormField;
