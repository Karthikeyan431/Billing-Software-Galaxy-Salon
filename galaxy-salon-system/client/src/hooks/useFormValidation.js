/**
 * Form Validation Hook for Galaxy Salon System
 * Provides reusable validation utilities for forms
 */

export const validationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email address',
  },
  phone: {
    pattern: /^[0-9+\-\s()]{10,}$/,
    message: 'Invalid phone number (minimum 10 digits)',
  },
  barcode: {
    pattern: /^[a-zA-Z0-9\-]+$/,
    message: 'Barcode can only contain letters, numbers, and hyphens',
  },
  price: {
    pattern: /^\d+(\.\d{1,2})?$/,
    message: 'Invalid price format',
  },
  positiveNumber: {
    pattern: /^[1-9]\d*$/,
    message: 'Must be a positive number',
  },
  name: {
    pattern: /^[a-zA-Z\s'-]{2,50}$/,
    message: 'Name must be 2-50 characters, letters and spaces only',
  },
  password: {
    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    message: 'Password must be at least 8 characters with letters and numbers',
  },
};

/**
 * Validate a single field
 */
export const validateField = (value, fieldName, rules = {}) => {
  const errors = [];

  // Check required
  if (rules.required && (!value || value.toString().trim() === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  if (!value) return errors;

  // Check pattern
  if (rules.pattern && !rules.pattern.test(value.toString())) {
    errors.push(rules.message || `Invalid ${fieldName}`);
  }

  // Check min length
  if (rules.minLength && value.toString().length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
  }

  // Check max length
  if (rules.maxLength && value.toString().length > rules.maxLength) {
    errors.push(`${fieldName} must be less than ${rules.maxLength} characters`);
  }

  // Check min value (for numbers)
  if (rules.min !== undefined && Number(value) < rules.min) {
    errors.push(`${fieldName} must be at least ${rules.min}`);
  }

  // Check max value (for numbers)
  if (rules.max !== undefined && Number(value) > rules.max) {
    errors.push(`${fieldName} must be no more than ${rules.max}`);
  }

  return errors;
};

/**
 * Validate entire form
 */
export const validateForm = (formData, validationSchema) => {
  const errors = {};

  Object.entries(validationSchema).forEach(([fieldName, rules]) => {
    const fieldErrors = validateField(formData[fieldName], fieldName, rules);
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors[0];
    }
  });

  return errors;
};

/**
 * React Hook for form validation
 */
import { useState } from 'react';

export const useFormValidation = (initialValues, validationSchema, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({ ...prev, [name]: newValue }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate on blur
    const rules = validationSchema[name];
    if (rules) {
      const fieldErrors = validateField(values[name], name, rules);
      if (fieldErrors.length > 0) {
        setErrors(prev => ({ ...prev, [name]: fieldErrors[0] }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = validateForm(values, validationSchema);
    setErrors(newErrors);

    // Mark all fields as touched
    const allTouched = Object.keys(validationSchema).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
  };
};
