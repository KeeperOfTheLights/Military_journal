import { UseFormSetError } from 'react-hook-form';

/**
 * Interface for the standardized API error format.
 */
interface ApiError {
    error?: {
        code?: string;
        message?: string;
        details?: Array<{
            loc: (string | number)[];
            msg: string;
            type: string;
        }>;
    };
    detail?: string | Array<{
        loc: (string | number)[];
        msg: string;
        type: string;
    }>;
}

/**
 * Standard error handler for general API errors.
 * @param error - The error object
 */
export const handleError = (error: any): string => {
    console.log('Error Log:', error);

    const data = error.response?.data as ApiError | undefined;

    if (typeof data?.detail === 'string') {
        return data.detail;
    }

    if (data?.error?.message) {
        return data.error.message;
    }

    if (Array.isArray(data?.detail)) {
        return data.detail.map(d => d.msg).join(', ');
    }

    return error.message || 'Произошла непредвиденная ошибка';
};

/**
 * Error handler specifically for react-hook-form.
 * @param error - The error object
 * @param form - The form object (providing setError method)
 */
export const handleFormError = (
    error: any,
    form: { setError: (...args: any[]) => void }
) => {
    console.log('Form Error Log:', error);

    const data = error.response?.data as ApiError | undefined;
    const detail = data?.detail;

    if (Array.isArray(detail)) {
        detail.forEach((err) => {
            const fieldName = err.loc[err.loc.length - 1];
            if (fieldName) {
                form.setError(fieldName as any, {
                    type: 'manual',
                    message: err.msg,
                });
            }
        });
    } else if (typeof detail === 'string') {
        form.setError('root', {
            type: 'manual',
            message: detail,
        });
    } else if (data?.error?.message) {
        form.setError('root', {
            type: 'manual',
            message: data.error.message,
        });
    }
};
