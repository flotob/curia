import { useState, useEffect, useCallback } from 'react';
import { 
  validatePositiveNumber,
  isValidEthAmount,
  isValidLyxAmount 
} from '@/lib/requirements/conversions';
import { 
  validateEthereumAddress,
  validateFollowerCount,
  validateENSPattern,
  validateTokenId 
} from '@/lib/requirements/validation';

// ===== TYPES =====

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationState {
  value: string;
  validation: ValidationResult;
  hasValidated: boolean;
}

// ===== BASE VALIDATION HOOK =====

export const useValidationState = (
  initialValue: string = '',
  validator: (value: string) => ValidationResult
) => {
  const [value, setValue] = useState(initialValue);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: false });
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    if (value.trim() || hasValidated) {
      const result = validator(value);
      setValidation(result);
      setHasValidated(true);
    } else {
      setValidation({ isValid: false });
    }
  }, [value, validator, hasValidated]);

  const setValue_ = useCallback((newValue: string) => {
    setValue(newValue);
    if (!hasValidated && newValue.trim()) {
      setHasValidated(true);
    }
  }, [hasValidated]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setValidation({ isValid: false });
    setHasValidated(false);
  }, [initialValue]);

  return {
    value,
    setValue: setValue_,
    validation,
    hasValidated,
    reset,
    state: { value, validation, hasValidated } as ValidationState
  };
};

// ===== AMOUNT VALIDATION HOOKS =====

export const useAmountValidation = (initialValue: string = '') => {
  return useValidationState(initialValue, validatePositiveNumber);
};

export const useEthAmountValidation = (initialValue: string = '') => {
  const baseValidation = useAmountValidation(initialValue);
  
  const ethValidator = useCallback((value: string) => {
    const baseResult = validatePositiveNumber(value);
    if (!baseResult.isValid) return baseResult;
    
    if (!isValidEthAmount(value)) {
      return { isValid: false, error: 'Invalid ETH amount' };
    }
    
    return { isValid: true };
  }, []);

  return useValidationState(initialValue, ethValidator);
};

export const useLyxAmountValidation = (initialValue: string = '') => {
  const lyxValidator = useCallback((value: string) => {
    const baseResult = validatePositiveNumber(value);
    if (!baseResult.isValid) return baseResult;
    
    if (!isValidLyxAmount(value)) {
      return { isValid: false, error: 'Invalid LYX amount' };
    }
    
    return { isValid: true };
  }, []);

  return useValidationState(initialValue, lyxValidator);
};

// ===== ADDRESS VALIDATION HOOKS =====

export const useAddressValidation = (initialValue: string = '') => {
  return useValidationState(initialValue, validateEthereumAddress);
};

export const useENSValidation = (initialValue: string = '') => {
  return useValidationState(initialValue, validateENSPattern);
};

// ===== SOCIAL VALIDATION HOOKS =====

export const useFollowerCountValidation = (initialValue: string = '') => {
  return useValidationState(initialValue, validateFollowerCount);
};

// ===== TOKEN VALIDATION HOOKS =====

export const useTokenIdValidation = (initialValue: string = '') => {
  return useValidationState(initialValue, validateTokenId);
};

// ===== FORM VALIDATION HOOKS =====

export interface FormField {
  name: string;
  validation: ValidationResult;
  required?: boolean;
}

export const useFormValidation = (fields: FormField[]) => {
  const [isFormValid, setIsFormValid] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const errors: Record<string, string> = {};
    let hasErrors = false;

    fields.forEach(field => {
      if (field.required && !field.validation.isValid) {
        hasErrors = true;
        if (field.validation.error) {
          errors[field.name] = field.validation.error;
        }
      }
    });

    setFormErrors(errors);
    setIsFormValid(!hasErrors);
  }, [fields]);

  return {
    isFormValid,
    formErrors,
    hasErrors: Object.keys(formErrors).length > 0
  };
};

// ===== KEYBOARD HANDLER HOOK =====

export const useKeyboardHandlers = (
  onSave?: () => void,
  onCancel?: () => void,
  saveEnabled: boolean = true
) => {
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && saveEnabled && onSave) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }, [onSave, onCancel, saveEnabled]);

  return { handleKeyPress };
};

// ===== INPUT HANDLER HOOKS =====

export const useNumericInput = (
  setValue: (value: string) => void,
  allowDecimals: boolean = true
) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const pattern = allowDecimals ? /^\d*\.?\d*$/ : /^\d*$/;
    
    if (value === '' || pattern.test(value)) {
      setValue(value);
    }
  }, [setValue, allowDecimals]);

  return { handleChange };
};

// ===== COMPOSITE VALIDATION HOOKS =====

// Hook that combines amount validation with keyboard and input handling
export const useAmountInput = (
  initialValue: string = '',
  validator: 'eth' | 'lyx' | 'number' = 'number',
  onSave?: () => void,
  onCancel?: () => void
) => {
  // Choose the appropriate validation hook
  const validationHook = validator === 'eth' 
    ? useEthAmountValidation(initialValue)
    : validator === 'lyx'
    ? useLyxAmountValidation(initialValue)
    : useAmountValidation(initialValue);

  const { handleKeyPress } = useKeyboardHandlers(onSave, onCancel, validationHook.validation.isValid);
  const { handleChange } = useNumericInput(validationHook.setValue, true);

  return {
    ...validationHook,
    handleChange,
    handleKeyPress,
    isReady: validationHook.validation.isValid && validationHook.value.trim() !== ''
  };
};