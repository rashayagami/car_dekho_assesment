import React, { memo, useCallback } from 'react';
import DynamicForm from './DynamicForm';
import './ChatMessage.css';

/**
 * Single chat message bubble.
 * Renders text messages or a DynamicForm when message_type is 'form_request'.
 */
const ChatMessage = memo(function ChatMessage({ message, onFormSubmit, isLast }) {
  const isUser = message.role === 'user';
  const isFormRequest = message.message_type === 'form_request' && message.form_config;
  const isFormActive = isFormRequest && isLast && message.is_active !== false;

  const handleFormSubmit = useCallback(
    (data) => {
      onFormSubmit(data, message.form_config?.purpose);
    },
    [onFormSubmit, message.form_config?.purpose]
  );

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (val) => {
    if (!val) return '';
    const num = Number(val);
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleScrollPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={`cm-row ${isUser ? 'cm-user' : 'cm-assistant'} ${message.metadata?.search_results ? 'cm-has-cars' : ''}`}>
      <div className="cm-bubble">
        {message.content && (
          <div className="cm-text">{message.content}</div>
        )}
        {isFormRequest && isFormActive && (
          <DynamicForm
            formConfig={message.form_config}
            onSubmit={handleFormSubmit}
            hideHeader={!!message.content}
            messageContent={message.content}
          />
        )}
        {isFormRequest && !isFormActive && (
          <div className="cm-form-archived">✓ Response recorded</div>
        )}
        <span className="cm-time">{formatTime(message.created_at)}</span>
      </div>

      {message.metadata?.search_results && message.metadata.search_results.length > 0 && (
        <div className="cm-cars-carousel-container">
          <div
            className="cm-cars-carousel"
            onWheel={handleScrollPropagation}
            onTouchStart={handleScrollPropagation}
            onTouchMove={handleScrollPropagation}
          >
            {message.metadata.search_results.map((car, idx) => {
              const brand = car.brand || '';
              const model = car.model || car.name || '';
              const variant = car.variant || '';
              const rawPrice = car.price_ex_showroom || car.price;
              const formattedPrice = formatPrice(rawPrice);
              const fuel = car.fuel_type || car.fuel || '';
              const transmission = car.transmission || '';
              const seating = car.seating_capacity || car.seating || '';
              const mileage = car.mileage_kmpl || car.mileage || '';
              const safety = car.safety_rating || '';
              const features = car.key_features || [];

              return (
                <div key={car.id || idx} className="cm-car-card">
                  <div className="cm-car-header">
                    <span className="cm-car-brand">{brand}</span>
                    <span className="cm-car-name">{model}</span>
                    {variant && <span className="cm-car-variant">{variant}</span>}
                  </div>
                  {formattedPrice && <div className="cm-car-price">{formattedPrice}</div>}
                  
                  <div className="cm-car-specs">
                    {fuel && (
                      <div className="cm-car-spec-item" title="Fuel Type">
                        <span>⛽</span>
                        <span>{capitalize(fuel)}</span>
                      </div>
                    )}
                    {transmission && (
                      <div className="cm-car-spec-item" title="Transmission">
                        <span>⚙️</span>
                        <span>{transmission.toUpperCase()}</span>
                      </div>
                    )}
                    {seating && (
                      <div className="cm-car-spec-item" title="Seating Capacity">
                        <span>👥</span>
                        <span>{seating} Seater</span>
                      </div>
                    )}
                    {mileage && (
                      <div className="cm-car-spec-item" title="Mileage">
                        <span>📈</span>
                        <span>{mileage} km/l</span>
                      </div>
                    )}
                  </div>

                  {safety && (
                    <div className="cm-car-safety" title="Safety Rating">
                      <span>★</span>
                      <span>{safety} Star NCAP</span>
                    </div>
                  )}

                  {features.length > 0 && (
                    <div className="cm-car-features">
                      {features.slice(0, 3).map((feat, fidx) => (
                        <span key={fidx} className="cm-car-feature-chip">
                          {feat.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatMessage;
