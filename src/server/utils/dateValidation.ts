/**
 * Server-side date validation utilities
 * Ensures consistent date handling and validation across API endpoints
 */

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
  parsedDate?: Date;
}

/**
 * Validate and parse a date input that could be string or number
 * @param dateInput - Date string (YYYY-MM-DD) or timestamp
 * @param fieldName - Name of the field for error messages
 * @returns Validation result with parsed date
 */
export function validateAndParseDate(dateInput: any, fieldName: string): DateValidationResult {
  if (dateInput === null || dateInput === undefined) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  let parsedDate: Date;

  // Handle string input
  if (typeof dateInput === 'string') {
    // Check for YYYY-MM-DD format (preferred)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      parsedDate = new Date(dateInput + 'T00:00:00Z');
    } 
    // Check if it's a numeric string (timestamp)
    else if (/^\d+$/.test(dateInput)) {
      parsedDate = new Date(parseInt(dateInput));
    } 
    // Try to parse other string formats
    else {
      parsedDate = new Date(dateInput);
    }
  }
  // Handle numeric input (timestamp)
  else if (typeof dateInput === 'number') {
    parsedDate = new Date(dateInput);
  }
  // Invalid input type
  else {
    return { 
      isValid: false, 
      error: `${fieldName} must be a date string (YYYY-MM-DD) or timestamp number` 
    };
  }

  // Check if the parsed date is valid
  if (isNaN(parsedDate.getTime())) {
    return { 
      isValid: false, 
      error: `${fieldName} is not a valid date` 
    };
  }

  // Check for reasonable date range (between 2020 and 2030)
  const year = parsedDate.getFullYear();
  if (year < 2020 || year > 2030) {
    return { 
      isValid: false, 
      error: `${fieldName} must be between 2020 and 2030` 
    };
  }

  return { 
    isValid: true, 
    parsedDate 
  };
}

/**
 * Validate a date range (start and end dates)
 * @param startDate - Start date input
 * @param endDate - End date input
 * @returns Validation result with parsed dates
 */
export function validateDateRange(startDate: any, endDate: any): {
  isValid: boolean;
  error?: string;
  startDate?: Date;
  endDate?: Date;
} {
  const startValidation = validateAndParseDate(startDate, 'start_date');
  if (!startValidation.isValid) {
    return { isValid: false, error: startValidation.error };
  }

  const endValidation = validateAndParseDate(endDate, 'end_date');
  if (!endValidation.isValid) {
    return { isValid: false, error: endValidation.error };
  }

  const startDateParsed = startValidation.parsedDate!;
  const endDateParsed = endValidation.parsedDate!;

  // Ensure start date is before end date
  if (startDateParsed >= endDateParsed) {
    return { 
      isValid: false, 
      error: 'Start date must be before end date' 
    };
  }

  // Check for reasonable duration (not more than 5 years)
  const diffYears = (endDateParsed.getTime() - startDateParsed.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (diffYears > 5) {
    return { 
      isValid: false, 
      error: 'Date range cannot exceed 5 years' 
    };
  }

  return { 
    isValid: true, 
    startDate: startDateParsed, 
    endDate: endDateParsed 
  };
}

/**
 * Convert a Date object to YYYY-MM-DD string format for database storage
 * @param date - Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Normalize date input to consistent YYYY-MM-DD format for database storage
 * @param dateInput - Date string or timestamp
 * @returns Normalized date string or null if invalid
 */
export function normalizeDateInput(dateInput: any): string | null {
  const validation = validateAndParseDate(dateInput, 'date');
  return validation.isValid ? formatDateForDB(validation.parsedDate!) : null;
}