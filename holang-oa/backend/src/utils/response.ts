/**
 * Unified API response format
 */

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * Success response
 */
export function success<T>(data: T, message: string = '操作成功'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
  };
}

/**
 * Error response
 */
export function error(message: string, code: number = 500, data: any = null): ApiResponse<any> {
  return {
    code,
    message,
    data,
  };
}

/**
 * Paginated response
 */
export function paginated<T>(
  list: T[],
  page: number,
  pageSize: number,
  total: number,
  message: string = '获取成功'
): ApiResponse<{ list: T[]; pagination: any }> {
  return {
    code: 0,
    message,
    data: {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  };
}
