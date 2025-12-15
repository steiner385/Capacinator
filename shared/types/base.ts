/**
 * Base entity types shared between frontend and backend
 * All database entities extend BaseEntity with standard audit fields
 */

/**
 * Base interface for all database entities
 * Provides common audit fields for tracking creation and updates
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generic API error response structure
 */
export interface ApiError {
  error: string;
  code?: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Generic success response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper for list endpoints
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
